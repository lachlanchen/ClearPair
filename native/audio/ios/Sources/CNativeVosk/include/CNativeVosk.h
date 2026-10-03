#pragma once
// Minimal declarations for the public Vosk C ABI. No microphone/network API.
// Upstream: https://github.com/alphacep/vosk-api/blob/v0.3.50/src/vosk_api.h
typedef struct VoskModel VoskModel;
typedef struct VoskRecognizer VoskRecognizer;
void vosk_set_log_level(int log_level);
VoskModel *vosk_model_new(const char *model_path);
void vosk_model_free(VoskModel *model);
VoskRecognizer *vosk_recognizer_new(VoskModel *model, float sample_rate);
void vosk_recognizer_free(VoskRecognizer *recognizer);
void vosk_recognizer_set_words(VoskRecognizer *recognizer, int words);
int vosk_recognizer_accept_waveform(VoskRecognizer *recognizer, const char *data, int length);
const char *vosk_recognizer_result(VoskRecognizer *recognizer);
const char *vosk_recognizer_final_result(VoskRecognizer *recognizer);
