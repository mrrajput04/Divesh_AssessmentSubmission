import { useState, useCallback } from "react";
import Btn from "../components/Btn";

const FLOORS = 10;

function initRooms() {
  const rooms = {};
  for (let f = 1; f <= FLOORS; f++) {
    rooms[f] = Array(f === 10 ? 7 : 10).fill("available");
  }
  return rooms;
}

function roomId(floor, idx) {
  return floor === 10 ? 1000 + idx + 1 : floor * 100 + idx + 1;
}

// Lift is on the LEFT. Room at idx=0 is closest to lift.
// Same floor: walk directly = |i1 - i2| mins
// Cross floor: walk to lift (i1) + vertical (|f1-f2|*2) + walk to room (i2)
function travelTime(f1, i1, f2, i2) {
  if (f1 === f2) return Math.abs(i1 - i2);
  return i1 + Math.abs(f1 - f2) * 2 + i2;
}

// Travel time = between the first (lowest floor, leftmost) and last (highest floor, rightmost) room
function groupTravelTime(rooms) {
  if (rooms.length <= 1) return 0;
  const sorted = [...rooms].sort((a, b) =>
    a.floor !== b.floor ? a.floor - b.floor : a.idx - b.idx
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return travelTime(first.floor, first.idx, last.floor, last.idx);
}

function combinations(arr, k) {
  if (k === 1) return arr.map((x) => [x]);
  const result = [];
  for (let i = 0; i <= arr.length - k; i++) {
    combinations(arr.slice(i + 1), k - 1).forEach((c) =>
      result.push([arr[i], ...c])
    );
    if (result.length > 50000) break;
  }
  return result;
}

function findOptimalRooms(rooms, n) {
  // Collect all available rooms across all floors
  const avail = [];
  for (let f = 1; f <= FLOORS; f++) {
    rooms[f].forEach((s, i) => {
      if (s === "available") avail.push({ floor: f, idx: i });
    });
  }
  if (avail.length < n) return null;

  const byFloor = {};
  avail.forEach((r) => {
    (byFloor[r.floor] = byFloor[r.floor] || []).push(r);
  });

  let best = null;
  let bestTime = Infinity;

  // Rule 2: Prioritize same floor — try every n-combo on each single floor
  for (const f in byFloor) {
    if (byFloor[f].length >= n) {
      for (const combo of combinations(byFloor[f], n)) {
        const t = groupTravelTime(combo);
        if (t < bestTime) {
          bestTime = t;
          best = combo;
        }
      }
    }
  }

  // If a same-floor solution found, return it immediately (Rule 2 priority)
  if (best) return best;

  // Rule 3 & 4: No single floor has enough rooms — span floors
  // Try ALL n-combinations across available rooms, pick minimum travel time
  for (const combo of combinations(avail, n)) {
    const t = groupTravelTime(combo);
    if (t < bestTime) {
      bestTime = t;
      best = combo;
    }
  }

  return best;
}

const COLORS = {
  available:    { bg: "#13131a", border: "#2a2a38", color: "#4a4a60" },
  occupied:     { bg: "#1e1428", border: "#5d4e8a", color: "#8b6fc0" },
  "newly-booked": { bg: "#0d2b1a", border: "#27ae60", color: "#27ae60" },
};

function Room({ floor, idx, status }) {
  const c = COLORS[status] || COLORS.available;
  return (
    <div
      title={`Room ${roomId(floor, idx)} — ${status}`}
      style={{
        width: 40, height: 38, border: `1px solid ${c.border}`,
        borderRadius: 5, background: c.bg, color: c.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontFamily: "inherit",
        transition: "all 0.2s",
        animation: status === "newly-booked" ? "pulse 0.4s ease" : "none",
        flexShrink: 0,
      }}
    >
      {roomId(floor, idx)}
    </div>
  );
}

export default function HotelReservation() {
  const [rooms, setRooms] = useState(initRooms);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState({ type: "info", text: 'Enter rooms (1–5) and click Book.' });

  const totalAvail = Object.values(rooms).flat().filter((s) => s === "available").length;

  const bookRooms = useCallback(() => {
    const n = parseInt(input);
    if (!n || n < 1 || n > 5) {
      setMsg({ type: "err", text: "Enter a number between 1 and 5." });
      return;
    }
    if (totalAvail < n) {
      setMsg({ type: "err", text: `Only ${totalAvail} rooms available.` });
      return;
    }

    // Settle previous newly-booked → occupied
    const next = {};
    for (let f = 1; f <= FLOORS; f++) {
      next[f] = rooms[f].map((s) => (s === "newly-booked" ? "occupied" : s));
    }

    const selected = findOptimalRooms(next, n);
    if (!selected) {
      setMsg({ type: "err", text: "Could not allocate rooms." });
      return;
    }

    selected.forEach((r) => { next[r.floor][r.idx] = "newly-booked"; });

    const tTime = groupTravelTime(selected);
    const names = [...selected]
      .sort((a, b) => a.floor !== b.floor ? a.floor - b.floor : a.idx - b.idx)
      .map((r) => roomId(r.floor, r.idx))
      .join(", ");

    setRooms(next);
    setMsg({ type: "ok", rooms: names, time: tTime });
  }, [input, rooms, totalAvail]);

  const randomOccupancy = () => {
    const next = {};
    for (let f = 1; f <= FLOORS; f++) {
      next[f] = Array(f === 10 ? 7 : 10).fill(null).map(() =>
        Math.random() < 0.4 ? "occupied" : "available"
      );
    }
    setRooms(next);
    setMsg({ type: "info", text: "Random occupancy generated." });
  };

  const resetAll = () => {
    setRooms(initRooms());
    setInput("");
    setMsg({ type: "info", text: 'Enter rooms (1–5) and click Book.' });
  };

  return (
    <>
      <style>{`
        @keyframes pulse { 0%{transform:scale(1)} 50%{transform:scale(1.18)} 100%{transform:scale(1)} }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
      <div style={{
        background: "#0a0a0f", minHeight: "100vh", padding: "28px 32px",
        fontFamily: "'DM Mono','Courier New',monospace", color: "#e8e8f0",
      }}>
        {/* Header */}
        <div style={{ fontFamily: "Georgia,serif", fontSize: 28, color: "#e8c97a", marginBottom: 2 }}>
          Hotel Reservation
        </div>
        <div style={{ fontSize: 11, color: "#6a6a80", letterSpacing: 2, textTransform: "uppercase", marginBottom: 24 }}>
          97 rooms · 10 floors · {totalAvail} available
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28, alignItems: "center" }}>
          <input
            type="number" min={1} max={5} placeholder="Rooms (1–5)"
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && bookRooms()}
            style={{
              background: "#13131a", border: "1px solid #2a2a38", color: "#e8e8f0",
              padding: "10px 14px", borderRadius: 6, fontFamily: "inherit",
              fontSize: 13, width: 150, outline: "none",
            }}
          />
          <Btn label="Book" onClick={bookRooms} primary />
          <Btn label="Random" onClick={randomOccupancy} />
          <Btn label="Reset" onClick={resetAll} />
        </div>

        {/* Hotel visualization */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", overflowX: "auto" }}>
          {/* Lift shaft */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: "#6a6a80", textAlign: "center", letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" }}>
              Lift
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {Array.from({ length: FLOORS }, (_, i) => FLOORS - i).map((f) => (
                <div key={f} style={{
                  width: 38, height: 38, background: "#0f1520", border: "1px solid #1a2535",
                  borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "#3a5070", fontWeight: 600,
                }}>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Floors */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {Array.from({ length: FLOORS }, (_, i) => FLOORS - i).map((f) => (
              <div key={f} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <div style={{ fontSize: 9, color: "#6a6a80", width: 24, textAlign: "right", flexShrink: 0 }}>
                  F{f}
                </div>
                {rooms[f].map((s, i) => (
                  <Room key={i} floor={f} idx={i} status={s} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div style={{
          marginTop: 20, padding: "14px 18px", background: "#13131a",
          border: "1px solid #2a2a38", borderRadius: 8, fontSize: 13, lineHeight: 1.9,
          maxWidth: 600,
        }}>
          {msg.type === "err" && <span style={{ color: "#e05555" }}>{msg.text}</span>}
          {msg.type === "info" && <span style={{ color: "#6a6a80" }}>{msg.text}</span>}
          {msg.type === "ok" && (
            <>
              Booked: <span style={{ color: "#27ae60" }}>{msg.rooms}</span>
              <br />
              Total travel time:{" "}
              <span style={{ color: "#e8c97a" }}>{msg.time} min</span>
            </>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
          {[
            { label: "Available", bg: "#13131a", border: "#2a2a38" },
            { label: "Occupied",  bg: "#1e1428", border: "#5d4e8a" },
            { label: "Just Booked", bg: "#0d2b1a", border: "#27ae60" },
          ].map(({ label, bg, border }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#6a6a80" }}>
              <div style={{ width: 12, height: 12, background: bg, border: `1px solid ${border}`, borderRadius: 2 }} />
              {label}
            </div>
          ))}
        </div>

        {/* Travel time info */}
        <div style={{ marginTop: 16, fontSize: 10, color: "#3a3a50", lineHeight: 1.8 }}>
          Horizontal: 1 min/room &nbsp;·&nbsp; Vertical: 2 min/floor &nbsp;·&nbsp; Max 5 rooms/booking
        </div>
      </div>
    </>
  );
}