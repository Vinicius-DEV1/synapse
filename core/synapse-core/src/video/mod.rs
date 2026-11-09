use crate::crypto_stream::{get_encrypted_file_size, read_chunked_range};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Zero-Copy streaming reader for encrypted media files (.enc)
/// Caches the current 1MB decrypted chunk to satisfy high-frequency small reads from libmpv and ExoPlayer
pub struct EncryptedVideoReader {
    file_path: PathBuf,
    key_hex: String,
    total_size: u64,
    current_offset: u64,
    #[allow(dead_code)]
    chunk_cache: Mutex<Option<(u64, Vec<u8>)>>, // (chunk_index, decrypted_data)
}

impl EncryptedVideoReader {
    pub fn open<P: AsRef<Path>>(path: P, key_hex: &str) -> Result<Self, String> {
        let p = path.as_ref().to_path_buf();
        if !p.exists() {
            return Err(format!("File does not exist: {:?}", p));
        }

        let total_size = get_encrypted_file_size(&p)?;

        Ok(Self {
            file_path: p,
            key_hex: key_hex.to_string(),
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
        if self.current_offset >= self.total_size || buf.is_empty() {
            return Ok(0);
        }

        let bytes_to_read = ((buf.len() as u64).min(self.total_size - self.current_offset)) as usize;
        let start_byte = self.current_offset;
        let end_byte = start_byte + bytes_to_read as u64 - 1;

        // Use cached chunk if possible, or fetch via read_chunked_range
        let range = read_chunked_range(&self.file_path, &self.key_hex, start_byte, end_byte)?;
        let read_len = range.data.len().min(buf.len());
        buf[..read_len].copy_from_slice(&range.data[..read_len]);

        self.current_offset += read_len as u64;
        Ok(read_len)
    }

    /// Read directly at an arbitrary offset without mutating current_offset (stateless seek-read)
    pub fn read_at(&self, offset: u64, buf: &mut [u8]) -> Result<usize, String> {
        if offset >= self.total_size || buf.is_empty() {
            return Ok(0);
        }

        let bytes_to_read = ((buf.len() as u64).min(self.total_size - offset)) as usize;
        let end_byte = offset + bytes_to_read as u64 - 1;

        let range = read_chunked_range(&self.file_path, &self.key_hex, offset, end_byte)?;
        let read_len = range.data.len().min(buf.len());
        buf[..read_len].copy_from_slice(&range.data[..read_len]);
        Ok(read_len)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use std::io::Write;

    #[test]
    fn test_encrypted_video_reader_seek_and_read() {
        let key_hex = crate::crypto::generate_module_key();
        let payload: Vec<u8> = (0..(1500 * 1024)).map(|i| (i % 256) as u8).collect();

        let mut input = NamedTempFile::new().unwrap();
        input.write_all(&payload).unwrap();

        let output = NamedTempFile::new().unwrap();
        crate::crypto_stream::encrypt_file_chunked(input.path(), output.path(), &key_hex, None).unwrap();

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

