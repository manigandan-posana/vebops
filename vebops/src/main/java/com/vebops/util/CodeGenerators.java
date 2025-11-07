package com.vebops.util;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Predicate;

public class CodeGenerators {

    /**
     * Returns the current year and month in two‑digit year format.  For
     * example, October 2025 would return "2510".  Using a two‑digit year
     * ensures generated identifiers match the required YYMM pattern.
     */
    private static String yymm() {
        return LocalDate.now().format(DateTimeFormatter.ofPattern("yyMM"));
    }

    /**
     * Generates the next identifier with a given prefix.  Identifiers are
     * composed of the prefix, the current year and month in YYMM format,
     * followed by a four digit random sequence.  Example: prefix "SRN"
     * might produce "SRN-2510-0427".
     *
     * The random sequence is generated between 1000 and 9999 inclusive.
     */
    public static String nextWithPrefix(String prefix) {
        int seq = ThreadLocalRandom.current().nextInt(1000, 10000);
        return prefix + "-" + yymm() + "-" + String.format("%04d", seq);
    }

    public static String unique(String prefix, Predicate<String> exists) {
        for (int i = 0; i < 20; i++) {
            String c = nextWithPrefix(prefix);
            if (!exists.test(c)) return c;
        }
        throw new IllegalStateException("Could not generate unique code for " + prefix);
    }
}
