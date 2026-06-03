function Btn({ label, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: primary ? "#e8c97a" : "#13131a",
        border: `1px solid ${primary ? "#e8c97a" : "#2a2a38"}`,
        color: primary ? "#000" : "#e8e8f0",
        padding: "10px 22px",
        borderRadius: 6,
        fontFamily: "inherit",
        fontSize: 11,
        cursor: "pointer",
        letterSpacing: 1.5,
        textTransform: "uppercase",
        fontWeight: primary ? 700 : 400,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export default Btn;
