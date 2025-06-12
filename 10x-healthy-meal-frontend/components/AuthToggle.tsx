import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import type { AuthForm } from "@/components/Auth";
import type { MouseEvent } from "react";

type AuthToggleProps = {
    currentForm: AuthForm;
    handleFormChange: (event: MouseEvent<HTMLElement>, newForm: AuthForm) => void;
};

export const AuthToggle = ({ currentForm, handleFormChange }: AuthToggleProps) => (
    <ToggleButtonGroup
        color="primary"
        value={currentForm}
        exclusive
        onChange={handleFormChange}
        aria-label="Auth form"
    >
        <ToggleButton
            value="login"
            disabled={currentForm === "login"}
        >
            Login
        </ToggleButton>
        <ToggleButton
            value="register"
            disabled={currentForm === "register"}
        >
            Register
        </ToggleButton>
    </ToggleButtonGroup>
)
