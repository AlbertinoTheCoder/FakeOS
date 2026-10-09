import { useEffect, useRef, useState } from "react";
import { fs, type Entry } from "../../services/filesystem";
import { useOS, type AppId } from "../../store";
import { download } from "../../utils/download";
export default function Calculator() {
  const [value, setValue] = useState("0"),
    [previous, setPrevious] = useState<number | null>(null),
    [op, setOp] = useState(""),
    [history, setHistory] = useState<string[]>([]);
  const press = (key: string) => {
    if (key === "C") {
      setValue("0");
      setPrevious(null);
      setOp("");
    } else if (key === "⌫") setValue(value.slice(0, -1) || "0");
    else if (key === "%") setValue(String(Number(value) / 100));
    else if (["+", "−", "×", "÷"].includes(key)) {
      setPrevious(Number(value));
      setOp(key);
      setValue("0");
    } else if (key === "=") {
      if (previous === null) return;
      const n = Number(value);
      const result =
        op === "+"
          ? previous + n
          : op === "−"
            ? previous - n
            : op === "×"
              ? previous * n
              : previous / n;
      setValue(String(result));
      setHistory([`${previous} ${op} ${n} = ${result}`, ...history]);
      setPrevious(null);
    } else if (key === "." && !value.includes(".")) setValue(value + ".");
    else if (/\d/.test(key)) setValue(value === "0" ? key : value + key);
  };
  return (
    <div
      className="calculator"
      tabIndex={0}
      onKeyDown={(e) => {
        const k =
          (
            {
              Enter: "=",
              "*": "×",
              "/": "÷",
              "-": "−",
              Escape: "C",
              Backspace: "⌫",
            } as Record<string, string>
          )[e.key] || e.key;
        if ("0123456789.+−×÷=C⌫".includes(k)) {
          e.preventDefault();
          press(k);
        }
      }}
    >
      <small>
        {previous} {op}
      </small>
      <output>{value}</output>
      <div className="calc-grid">
        {"C % ⌫ ÷ 7 8 9 × 4 5 6 − 1 2 3 + 0 . =".split(" ").map((k) => (
          <button
            className={k === "=" ? "accent" : ""}
            key={k}
            onClick={() => press(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <h4>History</h4>
      {history.slice(0, 8).map((h, i) => (
        <small key={i}>{h}</small>
      ))}
    </div>
  );
}
