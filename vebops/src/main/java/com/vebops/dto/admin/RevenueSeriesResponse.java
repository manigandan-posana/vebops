package com.vebops.dto.admin;

import java.math.BigDecimal;
import java.util.*;

public class RevenueSeriesResponse {
    public List<MonthTotal> items = new ArrayList<>();

    public static class MonthTotal {
        public int year;
        public int month; // 1..12
        public BigDecimal total;
    }
}
