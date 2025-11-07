package com.vebops.util;

import java.util.Map;

public class AiWriter {
  public static String expand(String seed, Map<String,Object> vars){
    StringBuilder b = new StringBuilder();
    b.append(seed == null ? "Please find the details below." : seed).append("\n\n");
    if(vars != null){
      vars.forEach((k,v) -> {
        if(v != null){
          b.append(Character.toUpperCase(k.charAt(0))).append(k.substring(1)).append(": ").append(v).append("\n");
        }
      });
    }
    b.append("\nRegards,\nVebops");
    return b.toString();
  }
}
