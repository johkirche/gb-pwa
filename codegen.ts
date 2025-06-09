import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    {
      "https://gb26-admin.johannische-kirche.org/graphql": {
        headers: {
          Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}`,
        },
      },
    },
  ],
  // documents: "src/**/*.vue",
  generates: {
    "gql/": {
      preset: "client",
      plugins: [],
    },
    // "./graphql.schema.json": {
    //   plugins: ["introspection"],
    // },
  },
};

export default config;
