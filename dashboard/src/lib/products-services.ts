import { request, ApiError } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";

export type ProductServiceType = "PRODUCT" | "SERVICE";

export interface ProductService {
  id: number;
  name: string;
  description: string | null;
  type: ProductServiceType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    leads: number;
    deals: number;
  };
}

export interface ListProductServicesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean | "true" | "false";
  type?: ProductServiceType;
}

export interface ProductServicesListResponse {
  productServices: ProductService[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateProductServicePayload {
  name: string;
  description?: string | null;
  type?: ProductServiceType;
  isActive?: boolean;
}

export interface UpdateProductServicePayload {
  name?: string;
  description?: string | null;
  type?: ProductServiceType;
  isActive?: boolean;
}

export async function fetchProductServices(
  params?: ListProductServicesParams,
): Promise<ProductServicesListResponse> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search.trim());
  if (params?.isActive !== undefined) {
    searchParams.set("isActive", String(params.isActive));
  }
  if (params?.type) searchParams.set("type", params.type);

  const query = searchParams.toString();
  const path = query ? `${ENDPOINTS.productsServices.list}?${query}` : ENDPOINTS.productsServices.list;

  return request<ProductServicesListResponse>(path, {
    method: "GET",
    token: session.token,
  });
}

export async function fetchProductServiceById(id: number): Promise<ProductService> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  const res = await request<{ productService: ProductService }>(
    ENDPOINTS.productsServices.byId(id),
    {
      method: "GET",
      token: session.token,
    },
  );

  return res.productService;
}

export async function createProductService(
  payload: CreateProductServicePayload,
): Promise<ProductService> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  const res = await request<{ productService: ProductService }>(
    ENDPOINTS.productsServices.create,
    {
      method: "POST",
      token: session.token,
      body: payload,
    },
  );

  return res.productService;
}

export async function updateProductService(
  id: number,
  payload: UpdateProductServicePayload,
): Promise<ProductService> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  const res = await request<{ productService: ProductService }>(
    ENDPOINTS.productsServices.update(id),
    {
      method: "PATCH",
      token: session.token,
      body: payload,
    },
  );

  return res.productService;
}

export async function deleteProductService(
  id: number,
): Promise<{ id: number; deleted: boolean }> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  return request<{ id: number; deleted: boolean }>(
    ENDPOINTS.productsServices.delete(id),
    {
      method: "DELETE",
      token: session.token,
    },
  );
}
