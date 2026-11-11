#ifndef SYNAPSE_BRIDGE_H
#define SYNAPSE_BRIDGE_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// Database handle (opaque)
typedef struct Database Database;

// Video reader handle (opaque)
typedef struct EncryptedVideoReader EncryptedVideoReader;
typedef struct SynapseFileOperation SynapseFileOperation;

// Database APIs
Database* synapse_db_open(const char* path);
void synapse_db_close(Database* db);
char* synapse_db_query_json(Database* db, const char* sql);
char* synapse_db_query_json_params(Database* db, const char* sql, const char* parameters_json);
int synapse_db_execute(Database* db, const char* sql);
int synapse_db_execute_params(Database* db, const char* sql, const char* parameters_json);

// Video Streaming APIs (for libmpv stream callback)
EncryptedVideoReader* synapse_video_reader_open(const char* file_path, const char* key_hex);
int64_t synapse_video_reader_size(EncryptedVideoReader* reader);
int64_t synapse_video_reader_seek(EncryptedVideoReader* reader, int64_t offset);
int64_t synapse_video_reader_read(EncryptedVideoReader* reader, uint8_t* buffer, size_t size);
void synapse_video_reader_close(EncryptedVideoReader* reader);

// Encrypted local file storage API (ENC1 chunked AES-GCM format)
SynapseFileOperation* synapse_file_operation_create(void);
void synapse_file_operation_cancel(SynapseFileOperation* operation);
void synapse_file_operation_close(SynapseFileOperation* operation);
int synapse_file_encrypt(const char* input_path, const char* output_path, const char* key_hex,
                         SynapseFileOperation* operation);
int synapse_file_encrypt_bytes(const uint8_t* input, size_t input_size, const char* output_path,
                               const char* key_hex, SynapseFileOperation* operation);
int synapse_file_decrypt(const char* input_path, const char* output_path, const char* key_hex,
                         SynapseFileOperation* operation);
int synapse_file_copy(const char* input_path, const char* output_path,
                      SynapseFileOperation* operation);

// FSRS Spaced Repetition APIs
int synapse_fsrs_calculate(
    double stability,
    double difficulty,
    int32_t reps,
    int32_t lapses,
    int32_t rating,
    int32_t elapsed_days,
    double* out_stability,
    double* out_difficulty,
    int32_t* out_scheduled_days
);

// Cryptography APIs
int synapse_crypto_derive_master_key(const char* password, uint8_t* out_key32);
char* synapse_crypto_hash_password(const char* password);
char* synapse_crypto_hash_password_v2(const char* password);
char* synapse_crypto_generate_module_key(void);
char* synapse_crypto_encrypt_module_key(const char* module_key, const uint8_t* master_key32);
char* synapse_crypto_decrypt_module_key(const char* encrypted_payload, const uint8_t* master_key32);
char* synapse_crypto_encrypt(const char* key_hex, const char* plaintext);
char* synapse_crypto_decrypt(const char* key_hex, const char* encrypted_payload);
void synapse_crypto_wipe_memory(void* ptr, size_t size);
void synapse_free_string(char* s);
void synapse_free_secret_string(char* s);

#ifdef __cplusplus
}
#endif

#endif // SYNAPSE_BRIDGE_H

