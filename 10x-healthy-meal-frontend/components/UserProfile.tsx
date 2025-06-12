"use client"

import { Card, CardContent, Typography, Stack, CardHeader } from "@mui/material";
import { useEffect, useState } from "react";

type UserProfileProps = {
    email?: string;
}

export const UserProfile = ({ email }: UserProfileProps) => {
    const [preferences, setPreferences] = useState("");

    useEffect(() => {
        fetch("/api/profiles/me").then(res => res.json()).then(res => setPreferences(res.preferences));
    }, [])

    return (
        <Card sx={{ width: 700 }} >
            <CardHeader title="User profile" />
            <CardContent>
                <Stack direction="row" gap={1}>
                    <Typography>Email: </Typography>
                    <Typography>{email ?? "-"}</Typography>
                </Stack>
                <Stack direction="row" gap={1}>
                    <Typography>Preferences: </Typography>
                    <Typography>{preferences}</Typography>
                </Stack>
            </CardContent>
        </Card>
    )
}
