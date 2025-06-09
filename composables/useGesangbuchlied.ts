import { query } from "gql-query-builder";
import { computed, unref, type Ref } from "vue";
import type { Gesangbuchlied } from "~/gql/graphql";

export const useGesangbuchlied = () => {
    const { graphql, createReactiveFetch } = useApiClient();
    const config = useRuntimeConfig();

    // GraphQL endpoint
    const graphqlEndpoint = `${config.public.directus.url}/graphql`;

    // Get reactive headers for useFetch
    const { graphqlHeaders } = createReactiveFetch();

    const fileFields = ["id", "title", "type", "filename_download", "filesize"];

    const autorFields = [
        "geburtsjahr",
        "id",
        "nachname",
        "status",
        "sterbejahr",
        "vorname",
    ];

    // Common fields for gesangbuchlied queries
    const getGesangbuchliedFields = () => [
        "id",
        "status",
        "titel",
        "date_updated",
        "einreicherName",
        "externerLink",
        "liedHatAenderung",
        "liednummer2000",
        "linkCloud",
        "melodieGeaendert",
        "textGeaendert",
        "rueckfrageAutor",
        {
            kategorieId: [
                "id",
                {
                    kategorie_id: ["name", "typ"],
                },
            ],
        },
        {
            melodieId: [
                "id",
                {
                    noten: [
                        "id",
                        {
                            directus_files_id: fileFields,
                        },
                    ],
                },
                {
                    autorId: [
                        "id",
                        {
                            autor_id: autorFields,
                        },
                    ],
                },
            ],
        },
        {
            textId: [
                "id",
                "strophenEinzeln",
                {
                    autorId: [
                        "id",
                        {
                            autor_id: autorFields,
                        },
                    ],
                },
            ],
        },
    ];

    // Build query for fetching gesangbuchlied list
    const buildGesangbuchliedQuery = (variables: {
        limit?: number;
        offset?: number;
        filter?: any;
    }) => {
        const queryVars: any = {};

        if (variables.limit !== undefined) {
            queryVars.limit = { value: variables.limit, type: "Int" };
        }
        if (variables.offset !== undefined) {
            queryVars.offset = { value: variables.offset, type: "Int" };
        }
        if (variables.filter !== undefined && variables.filter !== null) {
            queryVars.filter = {
                value: variables.filter,
                type: "gesangbuchlied_filter",
            };
        }
        return query({
            operation: "gesangbuchlied",
            variables: queryVars,
            fields: getGesangbuchliedFields(),
        });
    };

    // Build query for fetching single gesangbuchlied by ID
    const buildGesangbuchliedByIdQuery = (id: string | number) => {
        return query({
            operation: "gesangbuchlied_by_id",
            variables: {
                id: { value: id, type: "ID!" },
            },
            fields: getGesangbuchliedFields(),
        });
    };

    /**
     * Direct async query for gesangbuchlied - perfect for button clicks and imperative calls
     * Uses the API client with automatic token refresh
     */
    const queryGesangbuchlied = async (variables: {
        limit?: number;
        offset?: number;
        filter?: any;
    }): Promise<Gesangbuchlied[]> => {
        const queryBuilder = buildGesangbuchliedQuery({
            limit: variables.limit || 100,
            offset: variables.offset || 0,
            filter: variables.filter || null,
        });

        console.log(queryBuilder);

        try {
            const response = await graphql<{
                data: {
                    gesangbuchlied: Gesangbuchlied[];
                };
            }>(graphqlEndpoint, queryBuilder);

            return response.data?.gesangbuchlied || [];
        } catch (error) {
            console.error("Error fetching gesangbuchlied:", error);
            throw error;
        }
    };

    /**
     * Direct async query for single gesangbuchlied by ID
     * Uses the API client with automatic token refresh
     */
    const queryGesangbuchliedById = async (
        id: string | number
    ): Promise<Gesangbuchlied | null> => {
        const queryBuilder = buildGesangbuchliedByIdQuery(id);

        try {
            const response = await graphql<{
                data: {
                    gesangbuchlied_by_id: Gesangbuchlied;
                };
            }>(graphqlEndpoint, queryBuilder);

            return response.data?.gesangbuchlied_by_id || null;
        } catch (error) {
            console.error("Error fetching gesangbuchlied by ID:", error);
            throw error;
        }
    };

    /**
     * Fetch all gesangbuchlied with optional filtering
     * Uses useFetch with reactive auth headers
     */
    const fetchGesangbuchlied = async (options?: {
        limit?: number;
        offset?: number;
        filter?: any;
    }) => {
        const variables = {
            limit: options?.limit || 100,
            offset: options?.offset || 0,
            filter: options?.filter || null,
        };

        const queryBuilder = buildGesangbuchliedQuery(variables);

        return useFetch<{
            data: {
                gesangbuchlied: Gesangbuchlied[];
            };
        }>(graphqlEndpoint, {
            method: "POST",
            headers: graphqlHeaders,
            body: JSON.stringify(queryBuilder),
            key: `gesangbuchlied-${JSON.stringify(variables)}`,
            transform: (data: any) => data.data?.gesangbuchlied || [],
        });
    };

    /**
     * Fetch a single gesangbuchlied by ID
     * Uses useFetch with reactive auth headers
     */
    const fetchGesangbuchliedById = async (id: string | number) => {
        const queryBuilder = buildGesangbuchliedByIdQuery(id);

        return useFetch<{
            data: {
                gesangbuchlied_by_id: any;
            };
        }>(graphqlEndpoint, {
            method: "POST",
            headers: graphqlHeaders,
            body: JSON.stringify(queryBuilder),
            key: `gesangbuchlied-by-id-${id}`,
            transform: (data: any) => data.data?.gesangbuchlied_by_id || null,
        });
    };

    /**
     * Reactive query for gesangbuchlied list
     * Uses reactive auth headers that update automatically
     */
    const useGesangbuchliedQuery = (options?: {
        limit?: number;
        offset?: number;
        filter?: any;
    }) => {
        const variables = computed(() => ({
            limit: options?.limit || 100,
            offset: options?.offset || 0,
            filter: options?.filter || null,
        }));

        const queryKey = computed(
            () => `gesangbuchlied-${JSON.stringify(variables.value)}`
        );
        const queryBuilder = computed(() =>
            buildGesangbuchliedQuery(variables.value)
        );

        const {
            data,
            pending: loading,
            error,
            refresh: refetch,
        } = useFetch<{
            data: {
                gesangbuchlied: any[];
            };
        }>(graphqlEndpoint, {
            method: "POST",
            headers: graphqlHeaders,
            body: JSON.stringify(queryBuilder.value),
            key: queryKey.value,
            transform: (data: any) => data.data?.gesangbuchlied || [],
            watch: [variables],
        });

        return {
            data,
            loading,
            error,
            refetch,
        };
    };

    /**
     * Reactive query for single gesangbuchlied
     * Uses reactive auth headers that update automatically
     */
    const useGesangbuchliedByIdQuery = (
        id: Ref<string | number> | string | number
    ) => {
        const idRef = computed(() => unref(id));
        const queryKey = computed(() => `gesangbuchlied-by-id-${idRef.value}`);
        const queryBuilder = computed(() =>
            buildGesangbuchliedByIdQuery(idRef.value)
        );

        const {
            data: gesangbuchlied,
            pending: loading,
            error,
            refresh: refetch,
        } = useFetch<{
            data: {
                gesangbuchlied_by_id: any;
            };
        }>(graphqlEndpoint, {
            method: "POST",
            headers: graphqlHeaders,
            body: JSON.stringify(queryBuilder.value),
            key: queryKey.value,
            transform: (data: any) => data.data?.gesangbuchlied_by_id || null,
            watch: [idRef],
        });

        return {
            gesangbuchlied,
            loading,
            error,
            refetch,
        };
    };

    return {
        // Direct async methods with API client (automatic token refresh!)
        queryGesangbuchlied,
        queryGesangbuchliedById,

        // Methods using useFetch with reactive auth headers
        fetchGesangbuchlied,
        fetchGesangbuchliedById,

        // Reactive composables with reactive auth headers
        useGesangbuchliedQuery,
        useGesangbuchliedByIdQuery,
    };
};
