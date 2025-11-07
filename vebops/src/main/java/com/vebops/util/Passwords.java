package com.vebops.util;

import java.security.SecureRandom;

public final class Passwords {
    private static final String UPPERS  = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O
    private static final String LOWERS  = "abcdefghijkmnopqrstuvwxyz"; // no l
    private static final String DIGITS  = "23456789";                  // no 0/1
    private static final String SPECIAL = "@$!%*?&";
    private static final String ALL = UPPERS + LOWERS + DIGITS + SPECIAL;
    private static final SecureRandom RNG = new SecureRandom();

    private Passwords() {}

    public static String generate(int len) {
        int L = Math.max(len, 12);
        StringBuilder sb = new StringBuilder(L);
        // ensure at least one from each bucket
        sb.append(pick(UPPERS));
        sb.append(pick(LOWERS));
        sb.append(pick(DIGITS));
        sb.append(pick(SPECIAL));
        for (int i = 4; i < L; i++) sb.append(pick(ALL));
        // shuffle (Fisher–Yates)
        char[] a = sb.toString().toCharArray();
        for (int i = a.length - 1; i > 0; i--) {
            int j = RNG.nextInt(i + 1);
            char t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return new String(a);
    }

    private static char pick(String s) { return s.charAt(RNG.nextInt(s.length())); }
}
