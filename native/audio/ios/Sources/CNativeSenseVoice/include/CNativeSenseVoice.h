#pragma once
#include <stdint.h>
// Small nullable C boundary. No Swift fatalError or fabricated word metadata.
void *cp_sensevoice_create(const char *model, const char *tokens);
void cp_sensevoice_destroy(void *recognizer);
char *cp_sensevoice_text(void *recognizer, const float *samples, int32_t count);
void cp_sensevoice_free_text(char *text);
