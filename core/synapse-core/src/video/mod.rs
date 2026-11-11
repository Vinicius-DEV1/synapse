use crate::crypto_stream::{get_encrypted_file_size, read_chunked_range};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use zeroize::{Zeroize, Zeroizing};

/// Streams encrypted media while reusing the current decrypted chunk for small player reads.
pub struct EncryptedVideoReader {
    file_path: PathBuf,
    key_hex: Zeroizing<String>,
    total_size: u64,
    current_offset: u64,
    chunk_cache: Mutex<Option<(u64, Vec<u8>)>>,
}

impl EncryptedVideoReader {
    pub fn open<P: AsRef<Path>>(path: P, key_hex: &str) -> Result<Self, String> {
        let p = path.as_ref().to_path_buf();
        if !p.exists() {
            return Err(format!("File does not exist: {:?}", p));
        }

        let mut key_bytes = Zeroizing::new(hex::decode(key_hex).map_err(|_| "Invalid Key Hex")?);
        if key_bytes.len() != 32 {
            return Err("Key must be 32 bytes".into());
        }
        key_bytes.zeroize();
        let total_size = get_encrypted_file_size(&p)?;

        Ok(Self {
            file_path: p,
            key_hex: Zeroizing::new(key_hex.to_string()),
            total_size,
            current_offset: 0,
            chunk_cache: Mutex::new(None),
        })
    }

    /// Returns the total unencrypted size in bytes
    pub fn size(&self) -> u64 {
        self.total_size
    }

    /// Seeks to a specific byte position
    pub fn seek(&mut self, offset: u64) -> Result<u64, String> {
        if offset > self.total_size {
            self.current_offset = self.total_size;
        } else {
            self.current_offset = offset;
        }
        Ok(self.current_offset)
    }

    /// Reads up to `buf.len()` bytes into `buf` starting at `current_offset`.
    /// Advances `current_offset` by the number of bytes read.
    pub fn read(&mut self, buf: &mut [u8]) -> Result<usize, String> {
        let read_len = self.read_at(self.current_offset, buf)?;
        self.current_offset += read_len as u64;
        Ok(read_len)
    }

    /// Read directly at an arbitrary offset without mutating current_offset (stateless seek-read)
    pub fn read_at(&self, offset: u64, buf: &mut [u8]) -> Result<usize, String> {
        if offset >= self.total_size || buf.is_empty() {
            return Ok(0);
        }
        let bytes_to_read = ((buf.len() as u64).min(self.total_size - offset)) as usize;
        let chunk_size = crate::crypto_stream::CHUNK_SIZE as u64;
        let mut copied = 0usize;
        let mut cache = self
            .chunk_cache
            .lock()
            .map_err(|_| "Video chunk cache is unavailable".to_string())?;

        while copied < bytes_to_read {
            let current_offset = offset + copied as u64;
            let chunk_index = current_offset / chunk_size;
            let chunk_start = chunk_index * chunk_size;
            if cache.as_ref().map(|(cached_index, _)| *cached_index) != Some(chunk_index) {
                if let Some((_, cached_data)) = cache.as_mut() {
                    cached_data.zeroize();
                }
                let chunk_end = (chunk_start + chunk_size - 1).min(self.total_size - 1);
                let mut decrypted =
                    read_chunked_range(&self.file_path, &self.key_hex, chunk_start, chunk_end)?;
                *cache = Some((chunk_index, std::mem::take(&mut decrypted.data)));
            }

            let cached_data = &cache.as_ref().expect("chunk cache was populated").1;
            let in_chunk_offset = (current_offset - chunk_start) as usize;
            let available = cached_data.len().saturating_sub(in_chunk_offset);
            if available == 0 {
                return Err("Encrypted video chunk is incomplete".into());
            }
            let count = available.min(bytes_to_read - copied);
            buf[copied..copied + count]
                .copy_from_slice(&cached_data[in_chunk_offset..in_chunk_offset + count]);
            copied += count;
        }
        Ok(copied)
    }
}

impl Drop for EncryptedVideoReader {
    fn drop(&mut self) {
        if let Ok(cache) = self.chunk_cache.get_mut() {
            if let Some((_, decrypted_chunk)) = cache.as_mut() {
                decrypted_chunk.zeroize();
            }
            *cache = None;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_encrypted_video_reader_seek_and_read() {
        let key_hex = crate::crypto::generate_module_key();
        let payload: Vec<u8> = (0..(1500 * 1024)).map(|i| (i % 256) as u8).collect();

        let mut input = NamedTempFile::new().unwrap();
        input.write_all(&payload).unwrap();

        let output = NamedTempFile::new().unwrap();
        crate::crypto_stream::encrypt_file_chunked(input.path(), output.path(), &key_hex, None)
            .unwrap();

        let mut reader = EncryptedVideoReader::open(output.path(), &key_hex).unwrap();
        assert_eq!(reader.size(), payload.len() as u64);

        // Test sequential read
        let mut buf = vec![0u8; 1024];
        let n = reader.read(&mut buf).unwrap();
        assert_eq!(n, 1024);
        assert_eq!(&buf[..], &payload[..1024]);

        // Test seek forward to second chunk (1.1 MB)
        reader.seek(1100 * 1024).unwrap();
        let mut buf2 = vec![0u8; 512];
        let n2 = reader.read(&mut buf2).unwrap();
        assert_eq!(n2, 512);
        assert_eq!(&buf2[..], &payload[1100 * 1024..(1100 * 1024 + 512)]);

        // Test read_at
        let mut buf3 = vec![0u8; 256];
        let n3 = reader.read_at(500 * 1024, &mut buf3).unwrap();
        assert_eq!(n3, 256);
        assert_eq!(&buf3[..], &payload[500 * 1024..(500 * 1024 + 256)]);
    }
}
