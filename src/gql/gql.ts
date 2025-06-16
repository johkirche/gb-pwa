/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

const documents: Record<string, any> = {};
/**
 * The function is used to get the matching document string for a given query string.
 * @param source The query string to get the document for.
 * @returns The document string for the given query string.
 */
export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
