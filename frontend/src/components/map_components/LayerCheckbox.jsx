import React, { useCallback } from "react";

const LayerCheckbox = React.memo(({ label, checked, onChange }) => {
    const handleChange = useCallback(() => {
        onChange(!checked);
    }, [checked, onChange]);

    return (
        <div className="flex items-center justify-between">
            <label className="text-sm text-light-text-secondary dark:text-dark-text-secondary flex items-center">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-light-accent dark:text-dark-accent focus:ring-light-accent dark:focus:ring-dark-accent rounded border-light-secondary dark:border-dark-secondary"
                />
                {label}
            </label>
        </div>
    );
});

export default LayerCheckbox;