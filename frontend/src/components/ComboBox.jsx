import React, { forwardRef } from "react";
import "../styles/comboBox.css";

const toOption = (option, index) => {
  if (option && typeof option === "object" && !Array.isArray(option)) {
    const value =
      option.value === null || option.value === undefined
        ? ""
        : String(option.value);
    return {
      value,
      label:
        option.label === null || option.label === undefined
          ? value
          : option.label,
      disabled: Boolean(option.disabled),
      hidden: Boolean(option.hidden),
    };
  }

  const stringValue =
    option === null || option === undefined ? "" : String(option);
  return {
    value: stringValue,
    label: stringValue,
    disabled: false,
    hidden: false,
    key: `option-${index}`,
  };
};

const ComboBox = forwardRef(
  (
    {
      id,
      name,
      value,
      onChange,
      options = [],
      placeholder,
      placeholderValue = "",
      placeholderDisabled = false,
      className = "",
      disabled = false,
      required = false,
      children,
      ...rest
    },
    ref
  ) => {
    const wrapperClass = ["combo-box-wrapper", className]
      .filter(Boolean)
      .join(" ");
    const normalizedValue =
      value === null || value === undefined ? "" : String(value);

    const normalizedOptions = options.map((option, index) => {
      const normalized = toOption(option, index);
      return {
        value: normalized.value,
        label: normalized.label,
        disabled: normalized.disabled,
        hidden: normalized.hidden,
        key:
          normalized.value !== undefined && normalized.value !== null
            ? `option-${normalized.value}`
            : `option-${index}`,
      };
    });

    const shouldRenderPlaceholder =
      placeholder !== null && placeholder !== undefined;

    return (
      <div className={wrapperClass}>
        <select
          id={id}
          name={name}
          value={normalizedValue}
          onChange={onChange}
          ref={ref}
          className="combo-box-select"
          disabled={disabled}
          required={required}
          {...rest}
        >
          {shouldRenderPlaceholder && (
            <option
              value={String(placeholderValue)}
              disabled={placeholderDisabled}
            >
              {placeholder}
            </option>
          )}
          {normalizedOptions.map((option) => (
            <option
              key={option.key}
              value={option.value}
              disabled={option.disabled}
              hidden={option.hidden}
            >
              {option.label}
            </option>
          ))}
          {children}
        </select>
        <span
          className="combo-box-icon material-symbols-outlined"
          aria-hidden="true"
        >
          expand_more
        </span>
      </div>
    );
  }
);

ComboBox.displayName = "ComboBox";

export default ComboBox;
