import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { Transaction, TransactionType } from "@/types/finance";

type Session = Awaited<
  ReturnType<typeof supabase.auth.getSession>
>["data"]["session"];

export function useBudget() {
  const [session, setSession] = useState<Session | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const fetchTransactions = useCallback(async (nextSession: Session | null) => {
    if (!nextSession) {
      setTransactions([]);
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fel vid hämtning:", error);
      return;
    }

    setTransactions(data ?? []);
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);
      await fetchTransactions(currentSession);
      setLoading(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      await fetchTransactions(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [fetchTransactions]);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
      return false;
    }

    return true;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthError("");

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setAuthError(error.message);
      return false;
    }

    return true;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setTransactions([]);
    setAuthError("");
  }, []);

  const addTransaction = useCallback(
    async (input: {
      title: string;
      amount: string;
      category: string;
      type: TransactionType;
    }) => {
      if (!session || !input.title || !input.amount) {
        return false;
      }

      const { data, error } = await supabase
        .from("expenses")
        .insert([
          {
            title: input.title,
            amount: Number.parseFloat(input.amount),
            category: input.category,
            type: input.type,
            user_id: session.user.id,
          },
        ])
        .select();

      if (error) {
        console.error("Fel vid tillägg:", error);
        return false;
      }

      if (data && data[0]) {
        setTransactions((current) => [data[0] as Transaction, ...current]);
      }

      return true;
    },
    [session],
  );

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      console.error("Fel vid radering:", error);
      return false;
    }

    setTransactions((current) =>
      current.filter((transaction) => transaction.id !== id),
    );
    return true;
  }, []);

  const totalBalance = useMemo(
    () =>
      transactions.reduce((accumulator, current) => {
        return current.type === "income"
          ? accumulator + current.amount
          : accumulator - current.amount;
      }, 0),
    [transactions],
  );

  return {
    session,
    transactions,
    loading,
    authError,
    totalBalance,
    signIn,
    signUp,
    logout,
    addTransaction,
    deleteTransaction,
    setAuthError,
  };
}
