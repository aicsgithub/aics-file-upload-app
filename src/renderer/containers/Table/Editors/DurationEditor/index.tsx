import { Input } from "antd";
import classNames from "classnames";
import React, { useState } from "react";

import { Duration } from "../../../../types";

const styles = require("./styles.pcss");

interface Props {
  initialValue: Duration[];
  commitChanges: (value: Duration[]) => void;
}

interface State {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export default function DurationEditor({ initialValue, commitChanges }: Props) {
  const [value, setValue] = useState<State>(() => {
    if (initialValue.length === 1) {
      const initialDuration = initialValue[0];
      return {
        days: initialDuration.days.toString(),
        hours: initialDuration.hours.toString(),
        minutes: initialDuration.minutes.toString(),
        seconds: initialDuration.seconds.toString(),
      };
    }
    return {
      days: "0",
      hours: "0",
      minutes: "0",
      seconds: "0",
    };
  });

  function handleCommit() {
    const { days, hours, minutes, seconds } = value;
    const durationValue: Duration = {
      // Convert value to 0 if NaN
      days: Number(days) || 0,
      hours: Number(hours) || 0,
      minutes: Number(minutes) || 0,
      seconds: Number(seconds) || 0,
    };

    // Return duration object if any key has a value greater than 0
    if (Object.values(durationValue).some((val) => val > 0)) {
      commitChanges([durationValue]);
    } else {
      commitChanges([]);
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (
      !(e.relatedTarget instanceof Node) ||
      !e.currentTarget.contains(e.relatedTarget)
    ) {
      handleCommit();
    }
  }

  function onKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleCommit();
    }
  }

  function updateValue(update: Partial<State>) {
    setValue((prev) => ({ ...prev, ...update }));
  }

  return (
    <div onKeyPress={onKeyPress}>
      <Input.Group
        compact
        className={classNames(styles.defaultInput, styles.durationInput)}
        onBlur={handleBlur}
      >
        <Input
          autoFocus
          addonAfter="D"
          value={value.days}
          onChange={(e) =>
            updateValue({ days: e.target.value.replace(/\D/, "") })
          }
        />
        <Input
          addonAfter="H"
          value={value.hours}
          onChange={(e) =>
            updateValue({ hours: e.target.value.replace(/\D/, "") })
          }
        />
        <Input
          addonAfter="M"
          value={value.minutes}
          onChange={(e) =>
            updateValue({ minutes: e.target.value.replace(/\D/, "") })
          }
        />
        <Input
          addonAfter="S"
          value={value.seconds}
          onChange={(e) =>
            // Remove any value that is not "." or a digit
            updateValue({ seconds: e.target.value.replace(/[^.\d]/, "") })
          }
        />
      </Input.Group>
    </div>
  );
}
