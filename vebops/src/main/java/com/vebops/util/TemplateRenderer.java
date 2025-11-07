package com.vebops.util;

import java.util.Map;

public class TemplateRenderer {
    public static String render(String template, Map<String, Object> vars) {
        if (template == null) return "";
        String out = template;
        if (vars != null) {
            for (Map.Entry<String, Object> e : vars.entrySet()) {
                String key = "{{" + e.getKey() + "}}";
                out = out.replace(key, String.valueOf(e.getValue()));
            }
        }
        return out;
    }
}
