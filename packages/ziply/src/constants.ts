export const SIG_LOCAL_FILE_HEADER = 0x04034b50;
export const SIG_CENTRAL_DIRECTORY = 0x02014b50;
export const SIG_EOCD = 0x06054b50;

export const METHOD_STORE = 0;
export const UTF8_FLAG = 1 << 11;

export const LOCAL_HEADER_SIZE = 30;
export const CENTRAL_DIRECTORY_SIZE = 46;
export const EOCD_SIZE = 22;
export const MAX_EOCD_COMMENT_SIZE = 0xffff;
export const MAX_EOCD_SEARCH = EOCD_SIZE + MAX_EOCD_COMMENT_SIZE;
export const UINT16_MAX = 0xffff;
export const UINT32_MAX = 0xffffffff;
