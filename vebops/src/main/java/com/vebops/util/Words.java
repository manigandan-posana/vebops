package com.vebops.util;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;

public final class Words {
    private Words() {}

    private static final String[] BELOW_20 = {
        "Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
        "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"
    };
    private static final String[] TENS = {
        "","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"
    };

    /**
     * Converts the amount to words in Indian system (Crore, Lakh, Thousand, Hundred).
     * Example: 1234567.89 -> "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and Eighty Nine Paise"
     */
    public static String inIndianSystem(BigDecimal amount) {
        if (amount == null) return "Zero";
        BigDecimal positive = amount.abs().setScale(2, RoundingMode.HALF_UP);
        BigInteger rupees = positive.toBigInteger();
        int paise = positive.remainder(BigDecimal.ONE).movePointRight(2).intValueExact();

        String rupeeWords = rupees.signum() == 0 ? "Zero" : convertIndian(rupees);
        StringBuilder sb = new StringBuilder(rupeeWords);

        if (paise > 0) {
            sb.append(" and ").append(convertBelow100(paise)).append(" Paise");
        }
        return sb.toString().replaceAll("\\s+", " ").trim();
    }

    private static String convertIndian(BigInteger n) {
        if (n.equals(BigInteger.ZERO)) return "Zero";

        // Indian groups: Crore (10^7), Lakh (10^5), Thousand (10^3), Hundred (10^2)
        BigInteger crore = n.divide(BigInteger.valueOf(10000000));
        n = n.mod(BigInteger.valueOf(10000000));

        BigInteger lakh = n.divide(BigInteger.valueOf(100000));
        n = n.mod(BigInteger.valueOf(100000));

        BigInteger thousand = n.divide(BigInteger.valueOf(1000));
        n = n.mod(BigInteger.valueOf(1000));

        BigInteger hundred = n.divide(BigInteger.valueOf(100));
        BigInteger rest = n.mod(BigInteger.valueOf(100));

        StringBuilder sb = new StringBuilder();
        if (crore.signum() > 0) sb.append(convertBelow1000(crore.intValue())).append(" Crore ");
        if (lakh.signum() > 0) sb.append(convertBelow1000(lakh.intValue())).append(" Lakh ");
        if (thousand.signum() > 0) sb.append(convertBelow1000(thousand.intValue())).append(" Thousand ");
        if (hundred.signum() > 0) sb.append(BELOW_20[hundred.intValue()]).append(" Hundred ");
        if (rest.signum() > 0) {
            if (sb.length() > 0) sb.append("");
            sb.append(convertBelow100(rest.intValue()));
        }
        return sb.toString().replaceAll("\\s+", " ").trim();
    }

    private static String convertBelow1000(int n) {
        if (n < 100) return convertBelow100(n);
        int h = n / 100;
        int r = n % 100;
        if (r == 0) return BELOW_20[h] + " Hundred";
        return BELOW_20[h] + " Hundred " + convertBelow100(r);
    }

    private static String convertBelow100(int n) {
        if (n < 20) return BELOW_20[n];
        int t = n / 10;
        int u = n % 10;
        if (u == 0) return TENS[t];
        return TENS[t] + " " + BELOW_20[u];
    }
}
