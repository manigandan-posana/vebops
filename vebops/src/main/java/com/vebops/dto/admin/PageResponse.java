package com.vebops.dto.admin;

import java.util.List;

public class PageResponse<T> {
  public List<T> content;
  public int page;
  public int size;
  public long totalElements;
  public int totalPages;
  public boolean hasNext;

  public PageResponse() {}
  public PageResponse(List<T> content, int page, int size, long totalElements) {
    this.content = content;
    this.page = page;
    this.size = size;
    this.totalElements = totalElements;
    this.totalPages = (int)Math.ceil((double)totalElements / (double)size);
    this.hasNext = (page + 1) < this.totalPages;
  }
}
