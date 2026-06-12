const koffi = require('koffi');

const user32 = koffi.load('user32.dll');

const WndEnumProc = koffi.proto('bool __stdcall WndEnumProc(void *hwnd, intptr_t lParam)');

const EnumWindows = user32.func('bool __stdcall EnumWindows(WndEnumProc *callback, intptr_t lParam)');
const GetWindowTextLengthW = user32.func('int __stdcall GetWindowTextLengthW(void *hwnd)');
const GetWindowTextW = user32.func('int __stdcall GetWindowTextW(void *hwnd, uint16_t *lpString, int nMaxCount)');
const IsWindowVisible = user32.func('bool __stdcall IsWindowVisible(void *hwnd)');
const GetWindowRect = user32.func('bool __stdcall GetWindowRect(void *hwnd, int32_t *lpRect)');
const SetWindowPos = user32.func('bool __stdcall SetWindowPos(void *hwnd, void *hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags)');
const GetWindowLongPtrW = user32.func('intptr_t __stdcall GetWindowLongPtrW(void *hwnd, int nIndex)');
const SetWindowLongPtrW = user32.func('intptr_t __stdcall SetWindowLongPtrW(void *hwnd, int nIndex, intptr_t dwNewLong)');
const SetForegroundWindow = user32.func('bool __stdcall SetForegroundWindow(void *hwnd)');

const GWL_STYLE = -16;
const WS_CAPTION = 0x00c00000;
const WS_THICKFRAME = 0x00040000;
const WS_BORDER = 0x00800000;
const WS_DLGFRAME = 0x00400000;
const WS_SYSMENU = 0x00080000;

const SWP_NOZORDER = 0x0004;
const SWP_SHOWWINDOW = 0x0040;
const SWP_FRAMECHANGED = 0x0020;

const VALORANT_TITLE_PATTERN = /^valorant\s*$/i;
const EXCLUDED_TITLE_PATTERN = /ultrawide|window fit/i;

function readWindowTitle(hwnd) {
  const length = GetWindowTextLengthW(hwnd);
  if (length <= 0) {
    return '';
  }

  const buffer = Buffer.alloc((length + 1) * 2);
  const copied = GetWindowTextW(hwnd, buffer, length + 1);
  if (copied <= 0) {
    return '';
  }

  return buffer.toString('utf16le', 0, copied * 2).replace(/\0/g, '');
}

function readWindowRect(hwnd) {
  const rect = Buffer.alloc(16);
  if (!GetWindowRect(hwnd, rect)) {
    return null;
  }

  const left = rect.readInt32LE(0);
  const top = rect.readInt32LE(4);
  const right = rect.readInt32LE(8);
  const bottom = rect.readInt32LE(12);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function findValorantWindows() {
  const matches = [];

  const callback = koffi.register((hwnd) => {
    if (!IsWindowVisible(hwnd)) {
      return true;
    }

    const title = readWindowTitle(hwnd);
    if (!title || EXCLUDED_TITLE_PATTERN.test(title)) {
      return true;
    }

    if (VALORANT_TITLE_PATTERN.test(title.trim())) {
      matches.push({
        hwnd,
        title: title.trim(),
        rect: readWindowRect(hwnd),
      });
    }

    return true;
  }, koffi.pointer(WndEnumProc));

  try {
    EnumWindows(callback, 0);
  } finally {
    koffi.unregister(callback);
  }

  return matches;
}

function findValorantWindow() {
  return findValorantWindows()[0] ?? null;
}

function removeTitleBar(hwnd) {
  let style = Number(GetWindowLongPtrW(hwnd, GWL_STYLE));
  style &= ~(WS_CAPTION | WS_THICKFRAME | WS_BORDER | WS_DLGFRAME | WS_SYSMENU);
  SetWindowLongPtrW(hwnd, GWL_STYLE, style);
}

function buildVerticalFitBounds(currentRect, monitor) {
  const width = Math.min(currentRect.width, monitor.width);
  const x = monitor.x + Math.round((monitor.width - width) / 2);

  return {
    x,
    y: monitor.y,
    width,
    height: monitor.height,
  };
}

function fitValorantWindow(monitor) {
  const match = findValorantWindow();
  if (!match) {
    return {
      success: false,
      message: 'Valorant window not found. Open the game in windowed mode first.',
    };
  }

  const before = match.rect ?? readWindowRect(match.hwnd);
  if (!before) {
    return {
      success: false,
      message: 'Found Valorant but could not read the window size.',
    };
  }

  removeTitleBar(match.hwnd);

  const target = buildVerticalFitBounds(before, monitor);
  const success = SetWindowPos(
    match.hwnd,
    null,
    target.x,
    target.y,
    target.width,
    target.height,
    SWP_NOZORDER | SWP_SHOWWINDOW | SWP_FRAMECHANGED
  );

  SetForegroundWindow(match.hwnd);

  const after = readWindowRect(match.hwnd);

  if (!success) {
    return {
      success: false,
      message: 'Found Valorant but failed to resize the window.',
      before,
      after,
    };
  }

  return {
    success: true,
    message: `Removed title bar and stretched Valorant to ${target.width}×${target.height}.`,
    before,
    after,
    target,
  };
}

module.exports = {
  findValorantWindow,
  fitValorantWindow,
};
