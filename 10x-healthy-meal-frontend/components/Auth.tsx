"use client"

import React, { type MouseEvent, useState } from "react";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";
import { AuthToggle } from "@/components/AuthToggle";
import { Card, CardContent } from "@mui/material";
import { ErrorDisplay } from "@/components/ErrorDisplay";

export type AuthForm = "login" | "register";

export const Auth = () => {
    const [currentForm, setCurrentForm] = useState<AuthForm>('login');
    const [error, setError] = useState<string | null>(null);

    const handleFormToggle = (
        event: MouseEvent<HTMLElement>,
        newForm: AuthForm,
    ) => {
        setError(null);
        setCurrentForm(newForm);
    };

    return (
        <div>
            <AuthToggle currentForm={currentForm} handleFormChange={handleFormToggle} />
            <Card sx={{ minWidth: 450, minHeight: 400 }}>
                {error && <ErrorDisplay error={error} />}
                <CardContent sx={{ margin: 5 }} >
                    {currentForm === "login" && <LoginForm setError={setError}/>}
                    {currentForm === "register" && <RegisterForm setError={setError} />}
                </CardContent>
            </Card>
        </div>
    );
}
