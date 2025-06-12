import { Box } from "@mui/material";

type ErrorDisplayProps = {
    error: string;
}

export const ErrorDisplay = ({ error }: ErrorDisplayProps) => (
    <Box
        width="100%"
        textAlign="center"
        color="white"
        sx={{ backgroundColor: "#e56e51" }}
        p={2}
    >
        {error}
    </Box>
);
