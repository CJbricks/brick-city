/**
 * TouchControls.js
 * On-screen D-pad plus A, B, Map, and Menu. These sit in their own bar
 * under the map so a 390x844 phone never has to scroll the page to reach
 * them. Holding a direction uses pointer capture: if your thumb slides a
 * little, the hold still ends on pointerup instead of getting stuck.
 */

"use client";

const PAD = [
  { dir: "up", label: "▲", style: { gridColumn: 2, gridRow: 1 } },
  { dir: "left", label: "◀", style: { gridColumn: 1, gridRow: 2 } },
  { dir: "down", label: "▼", style: { gridColumn: 2, gridRow: 3 } },
  { dir: "right", label: "▶", style: { gridColumn: 3, gridRow: 2 } },
];

function bindHold(dir, onHold) {
  return {
    onPointerDown: (event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      onHold(dir, true);
    },
    onPointerUp: (event) => {
      onHold(dir, false);
    },
    onPointerCancel: () => onHold(dir, false),
    onContextMenu: (event) => event.preventDefault(),
  };
}

export function TouchControls({ onHold, onA, onB, onMap, onInventory, onMenu }) {
  return (
    <div className="touch-bar" data-testid="touch-bar">
      <div className="d-pad" data-testid="d-pad">
        {PAD.map((pad) => (
          <button
            key={pad.dir}
            type="button"
            className="pad-btn"
            style={pad.style}
            aria-label={pad.dir}
            {...bindHold(pad.dir, onHold)}
          >
            {pad.label}
          </button>
        ))}
      </div>
      <div className="face-col">
        <div className="sys-row">
          <button type="button" className="sys-btn" data-testid="btn-map" onClick={onMap}>
            MAP
          </button>
          <button type="button" className="sys-btn" data-testid="btn-inventory" onClick={onInventory}>
            INVENTORY
          </button>
          <button type="button" className="sys-btn" data-testid="btn-menu" onClick={onMenu}>
            MENU
          </button>
        </div>
        <div className="face-row">
          <button type="button" className="face-btn" data-testid="btn-b" onClick={onB} aria-label="B">
            B
          </button>
          <button type="button" className="face-btn" data-testid="btn-a" onClick={onA} aria-label="A">
            A
          </button>
        </div>
      </div>
    </div>
  );
}
