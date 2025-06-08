export const useGesangbuchlied = () => {
  const { token } = useDirectusToken();

  // GraphQL query for fetching gesangbuchlied
  const GET_GESANGBUCHLIED = gql`
    query GetGesangbuchlied(
      $limit: Int
      $offset: Int
      $filter: gesangbuchlied_filter
    ) {
      gesangbuchlied(limit: $limit, offset: $offset, filter: $filter) {
        id
        status
        sort
        user_created {
          id
          first_name
          last_name
        }
        date_created
        user_updated {
          id
          first_name
          last_name
        }
        date_updated
        titel
        autor
        komponist
        text
        melodie
        copyright
        kategorie {
          id
          name
        }
        audio_datei {
          id
          filename_disk
          filename_download
          title
          type
        }
        # Add other fields you need
      }
    }
  `;

  // Single item query
  const GET_GESANGBUCHLIED_BY_ID = gql`
    query GetGesangbuchliedById($id: ID!) {
      gesangbuchlied_by_id(id: $id) {
        id
        status
        titel
        autor
        komponist
        text
        melodie
        copyright
        kategorie {
          id
          name
        }
        audio_datei {
          id
          filename_disk
          filename_download
          title
          type
        }
        # Add other fields you need
      }
    }
  `;

  /**
   * Fetch all gesangbuchlied with optional filtering
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

    return useAsyncQuery(GET_GESANGBUCHLIED, variables, {
      context: {
        headers: {
          authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    });
  };

  /**
   * Fetch a single gesangbuchlied by ID
   */
  const fetchGesangbuchliedById = async (id: string | number) => {
    return useAsyncQuery(
      GET_GESANGBUCHLIED_BY_ID,
      { id },
      {
        context: {
          headers: {
            authorization: token.value ? `Bearer ${token.value}` : "",
          },
        },
      }
    );
  };

  /**
   * Reactive query for gesangbuchlied list
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

    const { result, loading, error, refetch } = useQuery(
      GET_GESANGBUCHLIED,
      variables,
      {
        context: {
          headers: {
            authorization: token.value ? `Bearer ${token.value}` : "",
          },
        },
        errorPolicy: "all",
      }
    );

    const gesangbuchlied = computed(() => result.value?.gesangbuchlied || []);

    return {
      gesangbuchlied,
      loading,
      error,
      refetch,
    };
  };

  /**
   * Reactive query for single gesangbuchlied
   */
  const useGesangbuchliedByIdQuery = (
    id: Ref<string | number> | string | number
  ) => {
    const variables = computed(() => ({ id: unref(id) }));

    const { result, loading, error, refetch } = useQuery(
      GET_GESANGBUCHLIED_BY_ID,
      variables,
      {
        context: {
          headers: {
            authorization: token.value ? `Bearer ${token.value}` : "",
          },
        },
        errorPolicy: "all",
      }
    );

    const gesangbuchlied = computed(
      () => result.value?.gesangbuchlied_by_id || null
    );

    return {
      gesangbuchlied,
      loading,
      error,
      refetch,
    };
  };

  return {
    // Queries
    GET_GESANGBUCHLIED,
    GET_GESANGBUCHLIED_BY_ID,

    // Methods
    fetchGesangbuchlied,
    fetchGesangbuchliedById,

    // Reactive composables
    useGesangbuchliedQuery,
    useGesangbuchliedByIdQuery,
  };
};
