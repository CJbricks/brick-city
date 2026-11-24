/**
 * CheatInput.js
 * GBC-styled text box for the "Nick Names" pause-menu entry.
 * One component on purpose: delete this file (and the cheats.js module)
 * when the developer codes go away before launch.
 *
 * A real <input> is required so phones open the on-screen keyboard.
 * While this panel is open, PlayScreen skips walk / A / map keys so
 * typing does not move the runner.
 */

"use client";

import { useEffect, useRef } from "react";
import { Box, Button, Text } from "@chakra-ui/react";

export function CheatInput({ value, onChange, onConfirm, onCancel }) {
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus on mount so desktop can type immediately and mobile brings
    // up the software keyboard.
    inputRef.current?.focus();
  }, []);

  function submit() {
    onConfirm(value);
  }

  return (
    <Box className="gbc-window" role="dialog" data-testid="cheat-input">
      <Text className="gbc-title">Nick Names</Text>
      <Box className="gbc-body">
        <p>Type a code. A or Enter confirms. B or Escape cancels.</p>
        <input
          ref={inputRef}
          className="cheat-code-field"
          data-testid="cheat-code-field"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={24}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            // Stop the play-screen listener from seeing these keys while
            // the box has focus, or WASD / arrows would steal the press.
            event.stopPropagation();
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
              return;
            }
            // Escape and the game's B key (X) cancel. Without this, X
            // would type into the field while the input is focused.
            if (event.key === "Escape" || event.key === "x" || event.key === "X") {
              event.preventDefault();
              onCancel();
            }
          }}
        />
        <div className="choice-row" style={{ marginTop: 8 }}>
          <Button
            type="button"
            className="gbc-btn"
            data-testid="cheat-confirm"
            onClick={submit}
          >
            OK
          </Button>
          <Button
            type="button"
            className="gbc-btn"
            data-testid="cheat-cancel"
            onClick={onCancel}
          >
            Back
          </Button>
        </div>
        <p className="menu-detail">A confirm · B back</p>
      </Box>
    </Box>
  );
}
