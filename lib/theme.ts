"use client";

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#335533", light: "#88aa88" },
    background: {
      default: "#000000",
      paper: "#1a1a1a",
    },
    text: { primary: "#cccccc", secondary: "#999999" },
  },
  typography: {
    fontFamily:
      'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    fontSize: 14,
  },
  components: {
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        },
        sizeSmall: {
          width: 36,
          height: 36,
        },
      },
    },
  },
});

export default theme;
