import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { TextField, Stack, Button } from "@mui/material";

type LoginFormProps = {
    setError: (error: string | null) => void;
}

export const LoginForm = ({ setError }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/profile");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <form onSubmit={handleLogin}>
        <Stack direction="column" height="100%" justifyContent="space-between" gap={2}>
            <TextField
                label="email"
                type="email"
                variant="outlined"
                onChange={(event) => {
                  setEmail(event?.target?.value)
                }}
                required
            />
            <TextField
                label="password"
                type="password"
                variant="outlined"
                onChange={(event) => {
                  setPassword(event?.target?.value)
                }}
                required
            />
            <Button variant="contained" type="submit" sx={{ height: 50 }} loading={isLoading}>
              Log in
            </Button>
        </Stack>
      </form>
  );
}
