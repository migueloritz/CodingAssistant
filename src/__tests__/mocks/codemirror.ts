// Mock CodeMirror modules
export const EditorView = jest.fn().mockImplementation(() => ({
  destroy: jest.fn(),
  dispatch: jest.fn(),
  state: {
    doc: {
      toString: jest.fn().mockReturnValue(''),
      length: 0,
    },
    selection: {
      main: {
        head: 0,
      },
    },
    update: jest.fn().mockReturnValue({
      changes: {},
    }),
  },
}));

export const EditorState = {
  create: jest.fn().mockReturnValue({
    doc: {
      toString: jest.fn().mockReturnValue(''),
      length: 0,
    },
    selection: {
      main: {
        head: 0,
      },
    },
    update: jest.fn(),
  }),
  readOnly: {
    of: jest.fn(),
  },
};

export const basicSetup = [];

export const oneDark = {};

export const python = jest.fn().mockReturnValue({});
export const javascript = jest.fn().mockReturnValue({});
export const cpp = jest.fn().mockReturnValue({});

// Mock theme
EditorView.theme = jest.fn().mockReturnValue({});
EditorView.updateListener = {
  of: jest.fn(),
};

export default {
  EditorView,
  EditorState,
  basicSetup,
  oneDark,
  python,
  javascript,
  cpp,
};