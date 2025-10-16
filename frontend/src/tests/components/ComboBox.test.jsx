/** @jest-environment jsdom */
import "@testing-library/jest-dom";

import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../styles/comboBox.css", () => ({}));

const ComboBox = require("../../components/ComboBox").default;

describe("ComboBox", () => {
  function Controlled({
    initialValue = "",
    options = [
      { value: "1", label: "First Option" },
      { value: "2", label: "Second Option" },
    ],
    placeholder = "Select an option",
  }) {
    const [value, setValue] = useState(initialValue);
    return (
      <ComboBox
        id="combo"
        name="combo"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        options={options}
        placeholder={placeholder}
      />
    );
  }

  it("renders the combobox with placeholder and options", () => {
    render(
      <ComboBox
        id="collectible"
        name="collectibleId"
        value=""
        onChange={() => {}}
        options={[
          { value: "1", label: "Badge One" },
          { value: "2", label: "Badge Two" },
        ]}
        placeholder="Select a collectible"
      />
    );

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("");
    expect(
      screen.getByRole("option", { name: "Select a collectible" })
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Badge Two" })).toHaveValue("2");
  });

  it("updates value when selecting a new option in controlled mode", async () => {
    render(<Controlled />);

    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "2");

    expect(select).toHaveValue("2");
  });

  it("normalizes primitive options to label/value pairs", () => {
    render(
      <ComboBox
        id="location"
        name="locationId"
        value="beta"
        onChange={() => {}}
        options={["alpha", "beta"]}
      />
    );

    const option = screen.getByRole("option", { name: "beta" });
    expect(option).toHaveValue("beta");
  });
});
