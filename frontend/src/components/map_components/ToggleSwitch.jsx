import React from 'react';

const ToggleSwitch = React.memo(({ checked, onChange, checkboxClass, labelClass, label }) => {
    return (
        <div className="flex items-center space-x-2">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className={`form-checkbox ${checkboxClass}`}
            />
            <span className={labelClass}>{label}</span>
        </div>
    );
});

export default ToggleSwitch;