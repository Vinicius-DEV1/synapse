#ifndef ENCRYPTED_VIDEO_STREAM_H
#define ENCRYPTED_VIDEO_STREAM_H

#include <mpv/client.h>

class MpvPlayerItem;

bool registerEncryptedVideoStream(mpv_handle *mpv, MpvPlayerItem *player);

#endif
