/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** ISO8601 Date values */
  Date: { input: any; output: any; }
  /** BigInt value */
  GraphQLBigInt: { input: any; output: any; }
  /** A Float or a String */
  GraphQLStringOrFloat: { input: any; output: any; }
  /** Hashed string values */
  Hash: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
};

export enum EventEnum {
  Create = 'create',
  Delete = 'delete',
  Update = 'update'
}

export type Mutation = {
  __typename?: 'Mutation';
  create_arbeitskreis_item?: Maybe<Arbeitskreis>;
  create_arbeitskreis_items: Array<Arbeitskreis>;
  create_auftrag_item?: Maybe<Auftrag>;
  create_auftrag_items: Array<Auftrag>;
  create_autor_item?: Maybe<Autor>;
  create_autor_items: Array<Autor>;
  create_bewertungKleinerKreis_item?: Maybe<BewertungKleinerKreis>;
  create_bewertungKleinerKreis_items: Array<BewertungKleinerKreis>;
  create_gesangbuchlied_files_item?: Maybe<Gesangbuchlied_Files>;
  create_gesangbuchlied_files_items: Array<Gesangbuchlied_Files>;
  create_gesangbuchlied_item?: Maybe<Gesangbuchlied>;
  create_gesangbuchlied_items: Array<Gesangbuchlied>;
  create_gesangbuchlied_kategorie_item?: Maybe<Gesangbuchlied_Kategorie>;
  create_gesangbuchlied_kategorie_items: Array<Gesangbuchlied_Kategorie>;
  create_kategorie_item?: Maybe<Kategorie>;
  create_kategorie_items: Array<Kategorie>;
  create_lizenz_item?: Maybe<Lizenz>;
  create_lizenz_items: Array<Lizenz>;
  create_melodieAlternativen_item?: Maybe<MelodieAlternativen>;
  create_melodieAlternativen_items: Array<MelodieAlternativen>;
  create_melodieAlternativen_melodie_item?: Maybe<MelodieAlternativen_Melodie>;
  create_melodieAlternativen_melodie_items: Array<MelodieAlternativen_Melodie>;
  create_melodie_autor_item?: Maybe<Melodie_Autor>;
  create_melodie_autor_items: Array<Melodie_Autor>;
  create_melodie_files_item?: Maybe<Melodie_Files>;
  create_melodie_files_items: Array<Melodie_Files>;
  create_melodie_item?: Maybe<Melodie>;
  create_melodie_items: Array<Melodie>;
  create_termin_item?: Maybe<Termin>;
  create_termin_items: Array<Termin>;
  create_text_autor_item?: Maybe<Text_Autor>;
  create_text_autor_items: Array<Text_Autor>;
  create_text_item?: Maybe<Text>;
  create_text_items: Array<Text>;
  delete_arbeitskreis_item?: Maybe<Delete_One>;
  delete_arbeitskreis_items?: Maybe<Delete_Many>;
  delete_auftrag_item?: Maybe<Delete_One>;
  delete_auftrag_items?: Maybe<Delete_Many>;
  delete_autor_item?: Maybe<Delete_One>;
  delete_autor_items?: Maybe<Delete_Many>;
  delete_bewertungKleinerKreis_item?: Maybe<Delete_One>;
  delete_bewertungKleinerKreis_items?: Maybe<Delete_Many>;
  delete_gesangbuchlied_files_item?: Maybe<Delete_One>;
  delete_gesangbuchlied_files_items?: Maybe<Delete_Many>;
  delete_gesangbuchlied_item?: Maybe<Delete_One>;
  delete_gesangbuchlied_items?: Maybe<Delete_Many>;
  delete_gesangbuchlied_kategorie_item?: Maybe<Delete_One>;
  delete_gesangbuchlied_kategorie_items?: Maybe<Delete_Many>;
  delete_kategorie_item?: Maybe<Delete_One>;
  delete_kategorie_items?: Maybe<Delete_Many>;
  delete_lizenz_item?: Maybe<Delete_One>;
  delete_lizenz_items?: Maybe<Delete_Many>;
  delete_melodieAlternativen_item?: Maybe<Delete_One>;
  delete_melodieAlternativen_items?: Maybe<Delete_Many>;
  delete_melodieAlternativen_melodie_item?: Maybe<Delete_One>;
  delete_melodieAlternativen_melodie_items?: Maybe<Delete_Many>;
  delete_melodie_autor_item?: Maybe<Delete_One>;
  delete_melodie_autor_items?: Maybe<Delete_Many>;
  delete_melodie_files_item?: Maybe<Delete_One>;
  delete_melodie_files_items?: Maybe<Delete_Many>;
  delete_melodie_item?: Maybe<Delete_One>;
  delete_melodie_items?: Maybe<Delete_Many>;
  delete_termin_item?: Maybe<Delete_One>;
  delete_termin_items?: Maybe<Delete_Many>;
  delete_text_autor_item?: Maybe<Delete_One>;
  delete_text_autor_items?: Maybe<Delete_Many>;
  delete_text_item?: Maybe<Delete_One>;
  delete_text_items?: Maybe<Delete_Many>;
  update_arbeitskreis_batch: Array<Arbeitskreis>;
  update_arbeitskreis_item?: Maybe<Arbeitskreis>;
  update_arbeitskreis_items: Array<Arbeitskreis>;
  update_auftrag_batch: Array<Auftrag>;
  update_auftrag_item?: Maybe<Auftrag>;
  update_auftrag_items: Array<Auftrag>;
  update_autor_batch: Array<Autor>;
  update_autor_item?: Maybe<Autor>;
  update_autor_items: Array<Autor>;
  update_bewertungKleinerKreis_batch: Array<BewertungKleinerKreis>;
  update_bewertungKleinerKreis_item?: Maybe<BewertungKleinerKreis>;
  update_bewertungKleinerKreis_items: Array<BewertungKleinerKreis>;
  update_gesangbuchlied_batch: Array<Gesangbuchlied>;
  update_gesangbuchlied_files_batch: Array<Gesangbuchlied_Files>;
  update_gesangbuchlied_files_item?: Maybe<Gesangbuchlied_Files>;
  update_gesangbuchlied_files_items: Array<Gesangbuchlied_Files>;
  update_gesangbuchlied_item?: Maybe<Gesangbuchlied>;
  update_gesangbuchlied_items: Array<Gesangbuchlied>;
  update_gesangbuchlied_kategorie_batch: Array<Gesangbuchlied_Kategorie>;
  update_gesangbuchlied_kategorie_item?: Maybe<Gesangbuchlied_Kategorie>;
  update_gesangbuchlied_kategorie_items: Array<Gesangbuchlied_Kategorie>;
  update_kategorie_batch: Array<Kategorie>;
  update_kategorie_item?: Maybe<Kategorie>;
  update_kategorie_items: Array<Kategorie>;
  update_lizenz_batch: Array<Lizenz>;
  update_lizenz_item?: Maybe<Lizenz>;
  update_lizenz_items: Array<Lizenz>;
  update_melodieAlternativen_batch: Array<MelodieAlternativen>;
  update_melodieAlternativen_item?: Maybe<MelodieAlternativen>;
  update_melodieAlternativen_items: Array<MelodieAlternativen>;
  update_melodieAlternativen_melodie_batch: Array<MelodieAlternativen_Melodie>;
  update_melodieAlternativen_melodie_item?: Maybe<MelodieAlternativen_Melodie>;
  update_melodieAlternativen_melodie_items: Array<MelodieAlternativen_Melodie>;
  update_melodie_autor_batch: Array<Melodie_Autor>;
  update_melodie_autor_item?: Maybe<Melodie_Autor>;
  update_melodie_autor_items: Array<Melodie_Autor>;
  update_melodie_batch: Array<Melodie>;
  update_melodie_files_batch: Array<Melodie_Files>;
  update_melodie_files_item?: Maybe<Melodie_Files>;
  update_melodie_files_items: Array<Melodie_Files>;
  update_melodie_item?: Maybe<Melodie>;
  update_melodie_items: Array<Melodie>;
  update_termin_batch: Array<Termin>;
  update_termin_item?: Maybe<Termin>;
  update_termin_items: Array<Termin>;
  update_text_autor_batch: Array<Text_Autor>;
  update_text_autor_item?: Maybe<Text_Autor>;
  update_text_autor_items: Array<Text_Autor>;
  update_text_batch: Array<Text>;
  update_text_item?: Maybe<Text>;
  update_text_items: Array<Text>;
};


export type MutationCreate_Arbeitskreis_ItemArgs = {
  data: Create_Arbeitskreis_Input;
};


export type MutationCreate_Arbeitskreis_ItemsArgs = {
  data?: InputMaybe<Array<Create_Arbeitskreis_Input>>;
  filter?: InputMaybe<Arbeitskreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Auftrag_ItemArgs = {
  data: Create_Auftrag_Input;
};


export type MutationCreate_Auftrag_ItemsArgs = {
  data?: InputMaybe<Array<Create_Auftrag_Input>>;
  filter?: InputMaybe<Auftrag_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Autor_ItemArgs = {
  data: Create_Autor_Input;
};


export type MutationCreate_Autor_ItemsArgs = {
  data?: InputMaybe<Array<Create_Autor_Input>>;
  filter?: InputMaybe<Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_BewertungKleinerKreis_ItemArgs = {
  data: Create_BewertungKleinerKreis_Input;
};


export type MutationCreate_BewertungKleinerKreis_ItemsArgs = {
  data?: InputMaybe<Array<Create_BewertungKleinerKreis_Input>>;
  filter?: InputMaybe<BewertungKleinerKreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Gesangbuchlied_Files_ItemArgs = {
  data: Create_Gesangbuchlied_Files_Input;
};


export type MutationCreate_Gesangbuchlied_Files_ItemsArgs = {
  data?: InputMaybe<Array<Create_Gesangbuchlied_Files_Input>>;
  filter?: InputMaybe<Gesangbuchlied_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Gesangbuchlied_ItemArgs = {
  data: Create_Gesangbuchlied_Input;
};


export type MutationCreate_Gesangbuchlied_ItemsArgs = {
  data?: InputMaybe<Array<Create_Gesangbuchlied_Input>>;
  filter?: InputMaybe<Gesangbuchlied_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Gesangbuchlied_Kategorie_ItemArgs = {
  data: Create_Gesangbuchlied_Kategorie_Input;
};


export type MutationCreate_Gesangbuchlied_Kategorie_ItemsArgs = {
  data?: InputMaybe<Array<Create_Gesangbuchlied_Kategorie_Input>>;
  filter?: InputMaybe<Gesangbuchlied_Kategorie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Kategorie_ItemArgs = {
  data: Create_Kategorie_Input;
};


export type MutationCreate_Kategorie_ItemsArgs = {
  data?: InputMaybe<Array<Create_Kategorie_Input>>;
  filter?: InputMaybe<Kategorie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Lizenz_ItemArgs = {
  data: Create_Lizenz_Input;
};


export type MutationCreate_Lizenz_ItemsArgs = {
  data?: InputMaybe<Array<Create_Lizenz_Input>>;
  filter?: InputMaybe<Lizenz_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_MelodieAlternativen_ItemArgs = {
  data: Create_MelodieAlternativen_Input;
};


export type MutationCreate_MelodieAlternativen_ItemsArgs = {
  data?: InputMaybe<Array<Create_MelodieAlternativen_Input>>;
  filter?: InputMaybe<MelodieAlternativen_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_MelodieAlternativen_Melodie_ItemArgs = {
  data: Create_MelodieAlternativen_Melodie_Input;
};


export type MutationCreate_MelodieAlternativen_Melodie_ItemsArgs = {
  data?: InputMaybe<Array<Create_MelodieAlternativen_Melodie_Input>>;
  filter?: InputMaybe<MelodieAlternativen_Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Melodie_Autor_ItemArgs = {
  data: Create_Melodie_Autor_Input;
};


export type MutationCreate_Melodie_Autor_ItemsArgs = {
  data?: InputMaybe<Array<Create_Melodie_Autor_Input>>;
  filter?: InputMaybe<Melodie_Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Melodie_Files_ItemArgs = {
  data: Create_Melodie_Files_Input;
};


export type MutationCreate_Melodie_Files_ItemsArgs = {
  data?: InputMaybe<Array<Create_Melodie_Files_Input>>;
  filter?: InputMaybe<Melodie_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Melodie_ItemArgs = {
  data: Create_Melodie_Input;
};


export type MutationCreate_Melodie_ItemsArgs = {
  data?: InputMaybe<Array<Create_Melodie_Input>>;
  filter?: InputMaybe<Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Termin_ItemArgs = {
  data: Create_Termin_Input;
};


export type MutationCreate_Termin_ItemsArgs = {
  data?: InputMaybe<Array<Create_Termin_Input>>;
  filter?: InputMaybe<Termin_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Text_Autor_ItemArgs = {
  data: Create_Text_Autor_Input;
};


export type MutationCreate_Text_Autor_ItemsArgs = {
  data?: InputMaybe<Array<Create_Text_Autor_Input>>;
  filter?: InputMaybe<Text_Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationCreate_Text_ItemArgs = {
  data: Create_Text_Input;
};


export type MutationCreate_Text_ItemsArgs = {
  data?: InputMaybe<Array<Create_Text_Input>>;
  filter?: InputMaybe<Text_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationDelete_Arbeitskreis_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Arbeitskreis_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Auftrag_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Auftrag_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Autor_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Autor_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_BewertungKleinerKreis_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_BewertungKleinerKreis_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Gesangbuchlied_Files_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Gesangbuchlied_Files_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Gesangbuchlied_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Gesangbuchlied_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Gesangbuchlied_Kategorie_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Gesangbuchlied_Kategorie_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Kategorie_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Kategorie_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Lizenz_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Lizenz_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_MelodieAlternativen_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_MelodieAlternativen_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_MelodieAlternativen_Melodie_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_MelodieAlternativen_Melodie_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Melodie_Autor_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Melodie_Autor_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Melodie_Files_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Melodie_Files_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Melodie_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Melodie_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Termin_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Termin_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Text_Autor_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Text_Autor_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationDelete_Text_ItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelete_Text_ItemsArgs = {
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
};


export type MutationUpdate_Arbeitskreis_BatchArgs = {
  data?: InputMaybe<Array<Update_Arbeitskreis_Input>>;
  filter?: InputMaybe<Arbeitskreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Arbeitskreis_ItemArgs = {
  data: Update_Arbeitskreis_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Arbeitskreis_ItemsArgs = {
  data: Update_Arbeitskreis_Input;
  filter?: InputMaybe<Arbeitskreis_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Auftrag_BatchArgs = {
  data?: InputMaybe<Array<Update_Auftrag_Input>>;
  filter?: InputMaybe<Auftrag_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Auftrag_ItemArgs = {
  data: Update_Auftrag_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Auftrag_ItemsArgs = {
  data: Update_Auftrag_Input;
  filter?: InputMaybe<Auftrag_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Autor_BatchArgs = {
  data?: InputMaybe<Array<Update_Autor_Input>>;
  filter?: InputMaybe<Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Autor_ItemArgs = {
  data: Update_Autor_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Autor_ItemsArgs = {
  data: Update_Autor_Input;
  filter?: InputMaybe<Autor_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_BewertungKleinerKreis_BatchArgs = {
  data?: InputMaybe<Array<Update_BewertungKleinerKreis_Input>>;
  filter?: InputMaybe<BewertungKleinerKreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_BewertungKleinerKreis_ItemArgs = {
  data: Update_BewertungKleinerKreis_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_BewertungKleinerKreis_ItemsArgs = {
  data: Update_BewertungKleinerKreis_Input;
  filter?: InputMaybe<BewertungKleinerKreis_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Gesangbuchlied_BatchArgs = {
  data?: InputMaybe<Array<Update_Gesangbuchlied_Input>>;
  filter?: InputMaybe<Gesangbuchlied_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Gesangbuchlied_Files_BatchArgs = {
  data?: InputMaybe<Array<Update_Gesangbuchlied_Files_Input>>;
  filter?: InputMaybe<Gesangbuchlied_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Gesangbuchlied_Files_ItemArgs = {
  data: Update_Gesangbuchlied_Files_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Gesangbuchlied_Files_ItemsArgs = {
  data: Update_Gesangbuchlied_Files_Input;
  filter?: InputMaybe<Gesangbuchlied_Files_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Gesangbuchlied_ItemArgs = {
  data: Update_Gesangbuchlied_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Gesangbuchlied_ItemsArgs = {
  data: Update_Gesangbuchlied_Input;
  filter?: InputMaybe<Gesangbuchlied_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Gesangbuchlied_Kategorie_BatchArgs = {
  data?: InputMaybe<Array<Update_Gesangbuchlied_Kategorie_Input>>;
  filter?: InputMaybe<Gesangbuchlied_Kategorie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Gesangbuchlied_Kategorie_ItemArgs = {
  data: Update_Gesangbuchlied_Kategorie_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Gesangbuchlied_Kategorie_ItemsArgs = {
  data: Update_Gesangbuchlied_Kategorie_Input;
  filter?: InputMaybe<Gesangbuchlied_Kategorie_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Kategorie_BatchArgs = {
  data?: InputMaybe<Array<Update_Kategorie_Input>>;
  filter?: InputMaybe<Kategorie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Kategorie_ItemArgs = {
  data: Update_Kategorie_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Kategorie_ItemsArgs = {
  data: Update_Kategorie_Input;
  filter?: InputMaybe<Kategorie_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Lizenz_BatchArgs = {
  data?: InputMaybe<Array<Update_Lizenz_Input>>;
  filter?: InputMaybe<Lizenz_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Lizenz_ItemArgs = {
  data: Update_Lizenz_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Lizenz_ItemsArgs = {
  data: Update_Lizenz_Input;
  filter?: InputMaybe<Lizenz_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_MelodieAlternativen_BatchArgs = {
  data?: InputMaybe<Array<Update_MelodieAlternativen_Input>>;
  filter?: InputMaybe<MelodieAlternativen_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_MelodieAlternativen_ItemArgs = {
  data: Update_MelodieAlternativen_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_MelodieAlternativen_ItemsArgs = {
  data: Update_MelodieAlternativen_Input;
  filter?: InputMaybe<MelodieAlternativen_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_MelodieAlternativen_Melodie_BatchArgs = {
  data?: InputMaybe<Array<Update_MelodieAlternativen_Melodie_Input>>;
  filter?: InputMaybe<MelodieAlternativen_Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_MelodieAlternativen_Melodie_ItemArgs = {
  data: Update_MelodieAlternativen_Melodie_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_MelodieAlternativen_Melodie_ItemsArgs = {
  data: Update_MelodieAlternativen_Melodie_Input;
  filter?: InputMaybe<MelodieAlternativen_Melodie_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Melodie_Autor_BatchArgs = {
  data?: InputMaybe<Array<Update_Melodie_Autor_Input>>;
  filter?: InputMaybe<Melodie_Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Melodie_Autor_ItemArgs = {
  data: Update_Melodie_Autor_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Melodie_Autor_ItemsArgs = {
  data: Update_Melodie_Autor_Input;
  filter?: InputMaybe<Melodie_Autor_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Melodie_BatchArgs = {
  data?: InputMaybe<Array<Update_Melodie_Input>>;
  filter?: InputMaybe<Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Melodie_Files_BatchArgs = {
  data?: InputMaybe<Array<Update_Melodie_Files_Input>>;
  filter?: InputMaybe<Melodie_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Melodie_Files_ItemArgs = {
  data: Update_Melodie_Files_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Melodie_Files_ItemsArgs = {
  data: Update_Melodie_Files_Input;
  filter?: InputMaybe<Melodie_Files_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Melodie_ItemArgs = {
  data: Update_Melodie_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Melodie_ItemsArgs = {
  data: Update_Melodie_Input;
  filter?: InputMaybe<Melodie_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Termin_BatchArgs = {
  data?: InputMaybe<Array<Update_Termin_Input>>;
  filter?: InputMaybe<Termin_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Termin_ItemArgs = {
  data: Update_Termin_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Termin_ItemsArgs = {
  data: Update_Termin_Input;
  filter?: InputMaybe<Termin_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Text_Autor_BatchArgs = {
  data?: InputMaybe<Array<Update_Text_Autor_Input>>;
  filter?: InputMaybe<Text_Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Text_Autor_ItemArgs = {
  data: Update_Text_Autor_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Text_Autor_ItemsArgs = {
  data: Update_Text_Autor_Input;
  filter?: InputMaybe<Text_Autor_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Text_BatchArgs = {
  data?: InputMaybe<Array<Update_Text_Input>>;
  filter?: InputMaybe<Text_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MutationUpdate_Text_ItemArgs = {
  data: Update_Text_Input;
  id: Scalars['ID']['input'];
};


export type MutationUpdate_Text_ItemsArgs = {
  data: Update_Text_Input;
  filter?: InputMaybe<Text_Filter>;
  ids: Array<InputMaybe<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Query = {
  __typename?: 'Query';
  arbeitskreis: Array<Arbeitskreis>;
  arbeitskreis_aggregated: Array<Arbeitskreis_Aggregated>;
  arbeitskreis_by_id?: Maybe<Arbeitskreis>;
  arbeitskreis_by_version?: Maybe<Version_Arbeitskreis>;
  auftrag: Array<Auftrag>;
  auftrag_aggregated: Array<Auftrag_Aggregated>;
  auftrag_by_id?: Maybe<Auftrag>;
  auftrag_by_version?: Maybe<Version_Auftrag>;
  autor: Array<Autor>;
  autor_aggregated: Array<Autor_Aggregated>;
  autor_by_id?: Maybe<Autor>;
  autor_by_version?: Maybe<Version_Autor>;
  bewertungKleinerKreis: Array<BewertungKleinerKreis>;
  bewertungKleinerKreis_aggregated: Array<BewertungKleinerKreis_Aggregated>;
  bewertungKleinerKreis_by_id?: Maybe<BewertungKleinerKreis>;
  bewertungKleinerKreis_by_version?: Maybe<Version_BewertungKleinerKreis>;
  gesangbuchlied: Array<Gesangbuchlied>;
  gesangbuchlied_aggregated: Array<Gesangbuchlied_Aggregated>;
  gesangbuchlied_by_id?: Maybe<Gesangbuchlied>;
  gesangbuchlied_by_version?: Maybe<Version_Gesangbuchlied>;
  gesangbuchlied_files: Array<Gesangbuchlied_Files>;
  gesangbuchlied_files_aggregated: Array<Gesangbuchlied_Files_Aggregated>;
  gesangbuchlied_files_by_id?: Maybe<Gesangbuchlied_Files>;
  gesangbuchlied_files_by_version?: Maybe<Version_Gesangbuchlied_Files>;
  gesangbuchlied_kategorie: Array<Gesangbuchlied_Kategorie>;
  gesangbuchlied_kategorie_aggregated: Array<Gesangbuchlied_Kategorie_Aggregated>;
  gesangbuchlied_kategorie_by_id?: Maybe<Gesangbuchlied_Kategorie>;
  gesangbuchlied_kategorie_by_version?: Maybe<Version_Gesangbuchlied_Kategorie>;
  kategorie: Array<Kategorie>;
  kategorie_aggregated: Array<Kategorie_Aggregated>;
  kategorie_by_id?: Maybe<Kategorie>;
  kategorie_by_version?: Maybe<Version_Kategorie>;
  lizenz: Array<Lizenz>;
  lizenz_aggregated: Array<Lizenz_Aggregated>;
  lizenz_by_id?: Maybe<Lizenz>;
  lizenz_by_version?: Maybe<Version_Lizenz>;
  melodie: Array<Melodie>;
  melodieAlternativen: Array<MelodieAlternativen>;
  melodieAlternativen_aggregated: Array<MelodieAlternativen_Aggregated>;
  melodieAlternativen_by_id?: Maybe<MelodieAlternativen>;
  melodieAlternativen_by_version?: Maybe<Version_MelodieAlternativen>;
  melodieAlternativen_melodie: Array<MelodieAlternativen_Melodie>;
  melodieAlternativen_melodie_aggregated: Array<MelodieAlternativen_Melodie_Aggregated>;
  melodieAlternativen_melodie_by_id?: Maybe<MelodieAlternativen_Melodie>;
  melodieAlternativen_melodie_by_version?: Maybe<Version_MelodieAlternativen_Melodie>;
  melodie_aggregated: Array<Melodie_Aggregated>;
  melodie_autor: Array<Melodie_Autor>;
  melodie_autor_aggregated: Array<Melodie_Autor_Aggregated>;
  melodie_autor_by_id?: Maybe<Melodie_Autor>;
  melodie_autor_by_version?: Maybe<Version_Melodie_Autor>;
  melodie_by_id?: Maybe<Melodie>;
  melodie_by_version?: Maybe<Version_Melodie>;
  melodie_files: Array<Melodie_Files>;
  melodie_files_aggregated: Array<Melodie_Files_Aggregated>;
  melodie_files_by_id?: Maybe<Melodie_Files>;
  melodie_files_by_version?: Maybe<Version_Melodie_Files>;
  termin: Array<Termin>;
  termin_aggregated: Array<Termin_Aggregated>;
  termin_by_id?: Maybe<Termin>;
  termin_by_version?: Maybe<Version_Termin>;
  text: Array<Text>;
  text_aggregated: Array<Text_Aggregated>;
  text_autor: Array<Text_Autor>;
  text_autor_aggregated: Array<Text_Autor_Aggregated>;
  text_autor_by_id?: Maybe<Text_Autor>;
  text_autor_by_version?: Maybe<Version_Text_Autor>;
  text_by_id?: Maybe<Text>;
  text_by_version?: Maybe<Version_Text>;
};


export type QueryArbeitskreisArgs = {
  filter?: InputMaybe<Arbeitskreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryArbeitskreis_AggregatedArgs = {
  filter?: InputMaybe<Arbeitskreis_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryArbeitskreis_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryArbeitskreis_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryAuftragArgs = {
  filter?: InputMaybe<Auftrag_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryAuftrag_AggregatedArgs = {
  filter?: InputMaybe<Auftrag_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryAuftrag_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAuftrag_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryAutorArgs = {
  filter?: InputMaybe<Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryAutor_AggregatedArgs = {
  filter?: InputMaybe<Autor_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryAutor_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAutor_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryBewertungKleinerKreisArgs = {
  filter?: InputMaybe<BewertungKleinerKreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryBewertungKleinerKreis_AggregatedArgs = {
  filter?: InputMaybe<BewertungKleinerKreis_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryBewertungKleinerKreis_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryBewertungKleinerKreis_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryGesangbuchliedArgs = {
  filter?: InputMaybe<Gesangbuchlied_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryGesangbuchlied_AggregatedArgs = {
  filter?: InputMaybe<Gesangbuchlied_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryGesangbuchlied_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGesangbuchlied_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryGesangbuchlied_FilesArgs = {
  filter?: InputMaybe<Gesangbuchlied_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryGesangbuchlied_Files_AggregatedArgs = {
  filter?: InputMaybe<Gesangbuchlied_Files_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryGesangbuchlied_Files_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGesangbuchlied_Files_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryGesangbuchlied_KategorieArgs = {
  filter?: InputMaybe<Gesangbuchlied_Kategorie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryGesangbuchlied_Kategorie_AggregatedArgs = {
  filter?: InputMaybe<Gesangbuchlied_Kategorie_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryGesangbuchlied_Kategorie_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGesangbuchlied_Kategorie_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryKategorieArgs = {
  filter?: InputMaybe<Kategorie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryKategorie_AggregatedArgs = {
  filter?: InputMaybe<Kategorie_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryKategorie_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryKategorie_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryLizenzArgs = {
  filter?: InputMaybe<Lizenz_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryLizenz_AggregatedArgs = {
  filter?: InputMaybe<Lizenz_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryLizenz_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryLizenz_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryMelodieArgs = {
  filter?: InputMaybe<Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryMelodieAlternativenArgs = {
  filter?: InputMaybe<MelodieAlternativen_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryMelodieAlternativen_AggregatedArgs = {
  filter?: InputMaybe<MelodieAlternativen_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryMelodieAlternativen_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMelodieAlternativen_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryMelodieAlternativen_MelodieArgs = {
  filter?: InputMaybe<MelodieAlternativen_Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryMelodieAlternativen_Melodie_AggregatedArgs = {
  filter?: InputMaybe<MelodieAlternativen_Melodie_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryMelodieAlternativen_Melodie_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMelodieAlternativen_Melodie_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryMelodie_AggregatedArgs = {
  filter?: InputMaybe<Melodie_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryMelodie_AutorArgs = {
  filter?: InputMaybe<Melodie_Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryMelodie_Autor_AggregatedArgs = {
  filter?: InputMaybe<Melodie_Autor_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryMelodie_Autor_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMelodie_Autor_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryMelodie_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMelodie_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryMelodie_FilesArgs = {
  filter?: InputMaybe<Melodie_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryMelodie_Files_AggregatedArgs = {
  filter?: InputMaybe<Melodie_Files_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryMelodie_Files_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMelodie_Files_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryTerminArgs = {
  filter?: InputMaybe<Termin_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryTermin_AggregatedArgs = {
  filter?: InputMaybe<Termin_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryTermin_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTermin_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryTextArgs = {
  filter?: InputMaybe<Text_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryText_AggregatedArgs = {
  filter?: InputMaybe<Text_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryText_AutorArgs = {
  filter?: InputMaybe<Text_Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryText_Autor_AggregatedArgs = {
  filter?: InputMaybe<Text_Autor_Filter>;
  groupBy?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type QueryText_Autor_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryText_Autor_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};


export type QueryText_By_IdArgs = {
  id: Scalars['ID']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryText_By_VersionArgs = {
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  arbeitskreis_mutated?: Maybe<Arbeitskreis_Mutated>;
  auftrag_mutated?: Maybe<Auftrag_Mutated>;
  autor_mutated?: Maybe<Autor_Mutated>;
  bewertungKleinerKreis_mutated?: Maybe<BewertungKleinerKreis_Mutated>;
  directus_activity_mutated?: Maybe<Directus_Activity_Mutated>;
  directus_dashboards_mutated?: Maybe<Directus_Dashboards_Mutated>;
  directus_files_mutated?: Maybe<Directus_Files_Mutated>;
  directus_flows_mutated?: Maybe<Directus_Flows_Mutated>;
  directus_folders_mutated?: Maybe<Directus_Folders_Mutated>;
  directus_notifications_mutated?: Maybe<Directus_Notifications_Mutated>;
  directus_operations_mutated?: Maybe<Directus_Operations_Mutated>;
  directus_panels_mutated?: Maybe<Directus_Panels_Mutated>;
  directus_permissions_mutated?: Maybe<Directus_Permissions_Mutated>;
  directus_presets_mutated?: Maybe<Directus_Presets_Mutated>;
  directus_revisions_mutated?: Maybe<Directus_Revisions_Mutated>;
  directus_roles_mutated?: Maybe<Directus_Roles_Mutated>;
  directus_settings_mutated?: Maybe<Directus_Settings_Mutated>;
  directus_shares_mutated?: Maybe<Directus_Shares_Mutated>;
  directus_translations_mutated?: Maybe<Directus_Translations_Mutated>;
  directus_users_mutated?: Maybe<Directus_Users_Mutated>;
  directus_versions_mutated?: Maybe<Directus_Versions_Mutated>;
  directus_webhooks_mutated?: Maybe<Directus_Webhooks_Mutated>;
  gesangbuchlied_files_mutated?: Maybe<Gesangbuchlied_Files_Mutated>;
  gesangbuchlied_kategorie_mutated?: Maybe<Gesangbuchlied_Kategorie_Mutated>;
  gesangbuchlied_mutated?: Maybe<Gesangbuchlied_Mutated>;
  kategorie_mutated?: Maybe<Kategorie_Mutated>;
  lizenz_mutated?: Maybe<Lizenz_Mutated>;
  melodieAlternativen_melodie_mutated?: Maybe<MelodieAlternativen_Melodie_Mutated>;
  melodieAlternativen_mutated?: Maybe<MelodieAlternativen_Mutated>;
  melodie_autor_mutated?: Maybe<Melodie_Autor_Mutated>;
  melodie_files_mutated?: Maybe<Melodie_Files_Mutated>;
  melodie_mutated?: Maybe<Melodie_Mutated>;
  termin_mutated?: Maybe<Termin_Mutated>;
  text_autor_mutated?: Maybe<Text_Autor_Mutated>;
  text_mutated?: Maybe<Text_Mutated>;
};


export type SubscriptionArbeitskreis_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionAuftrag_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionAutor_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionBewertungKleinerKreis_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Activity_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Dashboards_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Files_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Flows_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Folders_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Notifications_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Operations_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Panels_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Permissions_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Presets_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Revisions_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Roles_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Settings_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Shares_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Translations_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Users_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Versions_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionDirectus_Webhooks_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionGesangbuchlied_Files_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionGesangbuchlied_Kategorie_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionGesangbuchlied_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionKategorie_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionLizenz_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionMelodieAlternativen_Melodie_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionMelodieAlternativen_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionMelodie_Autor_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionMelodie_Files_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionMelodie_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionTermin_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionText_Autor_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};


export type SubscriptionText_MutatedArgs = {
  event?: InputMaybe<EventEnum>;
};

export type Arbeitskreis = {
  __typename?: 'arbeitskreis';
  ansprechpartner?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type Arbeitskreis_Aggregated = {
  __typename?: 'arbeitskreis_aggregated';
  avg?: Maybe<Arbeitskreis_Aggregated_Fields>;
  avgDistinct?: Maybe<Arbeitskreis_Aggregated_Fields>;
  count?: Maybe<Arbeitskreis_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Arbeitskreis_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Arbeitskreis_Aggregated_Fields>;
  min?: Maybe<Arbeitskreis_Aggregated_Fields>;
  sum?: Maybe<Arbeitskreis_Aggregated_Fields>;
  sumDistinct?: Maybe<Arbeitskreis_Aggregated_Fields>;
};

export type Arbeitskreis_Aggregated_Count = {
  __typename?: 'arbeitskreis_aggregated_count';
  ansprechpartner?: Maybe<Scalars['Int']['output']>;
  email?: Maybe<Scalars['Int']['output']>;
  icon?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['Int']['output']>;
};

export type Arbeitskreis_Aggregated_Fields = {
  __typename?: 'arbeitskreis_aggregated_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

export type Arbeitskreis_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Arbeitskreis_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Arbeitskreis_Filter>>>;
  ansprechpartner?: InputMaybe<String_Filter_Operators>;
  email?: InputMaybe<String_Filter_Operators>;
  icon?: InputMaybe<String_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  name?: InputMaybe<String_Filter_Operators>;
};

export type Arbeitskreis_Mutated = {
  __typename?: 'arbeitskreis_mutated';
  data?: Maybe<Arbeitskreis>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Auftrag = {
  __typename?: 'auftrag';
  /** Bis wann soll der Auftrag erledigt sein? (Sinnvoll, wenn Folgearbeiten auf diesen Auftrag warten) */
  abgabetermin?: Maybe<Scalars['Date']['output']>;
  abgabetermin_func?: Maybe<Date_Functions>;
  anmerkung?: Maybe<Scalars['String']['output']>;
  arbeitskreisId?: Maybe<Arbeitskreis>;
  auftraggeberId?: Maybe<Arbeitskreis>;
  auftragsartMelodie?: Maybe<Scalars['String']['output']>;
  auftragsartText?: Maybe<Scalars['String']['output']>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  date_updated_func?: Maybe<Datetime_Functions>;
  id: Scalars['ID']['output'];
  melodieId?: Maybe<Melodie>;
  status?: Maybe<Scalars['String']['output']>;
  textId?: Maybe<Text>;
  user_created?: Maybe<Directus_Users>;
  user_updated?: Maybe<Directus_Users>;
};


export type AuftragArbeitskreisIdArgs = {
  filter?: InputMaybe<Arbeitskreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type AuftragAuftraggeberIdArgs = {
  filter?: InputMaybe<Arbeitskreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type AuftragMelodieIdArgs = {
  filter?: InputMaybe<Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type AuftragTextIdArgs = {
  filter?: InputMaybe<Text_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type AuftragUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type AuftragUser_UpdatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Auftrag_Aggregated = {
  __typename?: 'auftrag_aggregated';
  avg?: Maybe<Auftrag_Aggregated_Fields>;
  avgDistinct?: Maybe<Auftrag_Aggregated_Fields>;
  count?: Maybe<Auftrag_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Auftrag_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Auftrag_Aggregated_Fields>;
  min?: Maybe<Auftrag_Aggregated_Fields>;
  sum?: Maybe<Auftrag_Aggregated_Fields>;
  sumDistinct?: Maybe<Auftrag_Aggregated_Fields>;
};

export type Auftrag_Aggregated_Count = {
  __typename?: 'auftrag_aggregated_count';
  /** Bis wann soll der Auftrag erledigt sein? (Sinnvoll, wenn Folgearbeiten auf diesen Auftrag warten) */
  abgabetermin?: Maybe<Scalars['Int']['output']>;
  anmerkung?: Maybe<Scalars['Int']['output']>;
  arbeitskreisId?: Maybe<Scalars['Int']['output']>;
  /** Wer ist Auftraggeber / an wen können Rückfragen zum Auftrag gestellt werden? */
  auftraggeberId?: Maybe<Scalars['Int']['output']>;
  auftragsartMelodie?: Maybe<Scalars['Int']['output']>;
  auftragsartText?: Maybe<Scalars['Int']['output']>;
  date_created?: Maybe<Scalars['Int']['output']>;
  date_updated?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  melodieId?: Maybe<Scalars['Int']['output']>;
  status?: Maybe<Scalars['Int']['output']>;
  textId?: Maybe<Scalars['Int']['output']>;
  user_created?: Maybe<Scalars['Int']['output']>;
  user_updated?: Maybe<Scalars['Int']['output']>;
};

export type Auftrag_Aggregated_Fields = {
  __typename?: 'auftrag_aggregated_fields';
  arbeitskreisId?: Maybe<Scalars['Float']['output']>;
  /** Wer ist Auftraggeber / an wen können Rückfragen zum Auftrag gestellt werden? */
  auftraggeberId?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  melodieId?: Maybe<Scalars['Float']['output']>;
  textId?: Maybe<Scalars['Float']['output']>;
};

export type Auftrag_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Auftrag_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Auftrag_Filter>>>;
  abgabetermin?: InputMaybe<Date_Filter_Operators>;
  abgabetermin_func?: InputMaybe<Date_Function_Filter_Operators>;
  anmerkung?: InputMaybe<String_Filter_Operators>;
  arbeitskreisId?: InputMaybe<Arbeitskreis_Filter>;
  auftraggeberId?: InputMaybe<Arbeitskreis_Filter>;
  auftragsartMelodie?: InputMaybe<String_Filter_Operators>;
  auftragsartText?: InputMaybe<String_Filter_Operators>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  date_updated?: InputMaybe<Date_Filter_Operators>;
  date_updated_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  melodieId?: InputMaybe<Melodie_Filter>;
  status?: InputMaybe<String_Filter_Operators>;
  textId?: InputMaybe<Text_Filter>;
  user_created?: InputMaybe<Directus_Users_Filter>;
  user_updated?: InputMaybe<Directus_Users_Filter>;
};

export type Auftrag_Mutated = {
  __typename?: 'auftrag_mutated';
  data?: Maybe<Auftrag>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Autor = {
  __typename?: 'autor';
  geburtsjahr?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  nachname: Scalars['String']['output'];
  status?: Maybe<Scalars['String']['output']>;
  sterbejahr?: Maybe<Scalars['Int']['output']>;
  vorname?: Maybe<Scalars['String']['output']>;
};

export type Autor_Aggregated = {
  __typename?: 'autor_aggregated';
  avg?: Maybe<Autor_Aggregated_Fields>;
  avgDistinct?: Maybe<Autor_Aggregated_Fields>;
  count?: Maybe<Autor_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Autor_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Autor_Aggregated_Fields>;
  min?: Maybe<Autor_Aggregated_Fields>;
  sum?: Maybe<Autor_Aggregated_Fields>;
  sumDistinct?: Maybe<Autor_Aggregated_Fields>;
};

export type Autor_Aggregated_Count = {
  __typename?: 'autor_aggregated_count';
  geburtsjahr?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  nachname?: Maybe<Scalars['Int']['output']>;
  status?: Maybe<Scalars['Int']['output']>;
  sterbejahr?: Maybe<Scalars['Int']['output']>;
  vorname?: Maybe<Scalars['Int']['output']>;
};

export type Autor_Aggregated_Fields = {
  __typename?: 'autor_aggregated_fields';
  geburtsjahr?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  sterbejahr?: Maybe<Scalars['Float']['output']>;
};

export type Autor_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Autor_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Autor_Filter>>>;
  geburtsjahr?: InputMaybe<Number_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  nachname?: InputMaybe<String_Filter_Operators>;
  status?: InputMaybe<String_Filter_Operators>;
  sterbejahr?: InputMaybe<Number_Filter_Operators>;
  vorname?: InputMaybe<String_Filter_Operators>;
};

export type Autor_Mutated = {
  __typename?: 'autor_mutated';
  data?: Maybe<Autor>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type BewertungKleinerKreis = {
  __typename?: 'bewertungKleinerKreis';
  bezeichner?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  rangfolge?: Maybe<Scalars['Int']['output']>;
};

export type BewertungKleinerKreis_Aggregated = {
  __typename?: 'bewertungKleinerKreis_aggregated';
  avg?: Maybe<BewertungKleinerKreis_Aggregated_Fields>;
  avgDistinct?: Maybe<BewertungKleinerKreis_Aggregated_Fields>;
  count?: Maybe<BewertungKleinerKreis_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<BewertungKleinerKreis_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<BewertungKleinerKreis_Aggregated_Fields>;
  min?: Maybe<BewertungKleinerKreis_Aggregated_Fields>;
  sum?: Maybe<BewertungKleinerKreis_Aggregated_Fields>;
  sumDistinct?: Maybe<BewertungKleinerKreis_Aggregated_Fields>;
};

export type BewertungKleinerKreis_Aggregated_Count = {
  __typename?: 'bewertungKleinerKreis_aggregated_count';
  bezeichner?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  rangfolge?: Maybe<Scalars['Int']['output']>;
};

export type BewertungKleinerKreis_Aggregated_Fields = {
  __typename?: 'bewertungKleinerKreis_aggregated_fields';
  id?: Maybe<Scalars['Float']['output']>;
  rangfolge?: Maybe<Scalars['Float']['output']>;
};

export type BewertungKleinerKreis_Filter = {
  _and?: InputMaybe<Array<InputMaybe<BewertungKleinerKreis_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<BewertungKleinerKreis_Filter>>>;
  bezeichner?: InputMaybe<String_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  rangfolge?: InputMaybe<Number_Filter_Operators>;
};

export type BewertungKleinerKreis_Mutated = {
  __typename?: 'bewertungKleinerKreis_mutated';
  data?: Maybe<BewertungKleinerKreis>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Big_Int_Filter_Operators = {
  _between?: InputMaybe<Array<InputMaybe<Scalars['GraphQLBigInt']['input']>>>;
  _eq?: InputMaybe<Scalars['GraphQLBigInt']['input']>;
  _gt?: InputMaybe<Scalars['GraphQLBigInt']['input']>;
  _gte?: InputMaybe<Scalars['GraphQLBigInt']['input']>;
  _in?: InputMaybe<Array<InputMaybe<Scalars['GraphQLBigInt']['input']>>>;
  _lt?: InputMaybe<Scalars['GraphQLBigInt']['input']>;
  _lte?: InputMaybe<Scalars['GraphQLBigInt']['input']>;
  _nbetween?: InputMaybe<Array<InputMaybe<Scalars['GraphQLBigInt']['input']>>>;
  _neq?: InputMaybe<Scalars['GraphQLBigInt']['input']>;
  _nin?: InputMaybe<Array<InputMaybe<Scalars['GraphQLBigInt']['input']>>>;
  _nnull?: InputMaybe<Scalars['Boolean']['input']>;
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Boolean_Filter_Operators = {
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
  _nnull?: InputMaybe<Scalars['Boolean']['input']>;
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Count_Function_Filter_Operators = {
  count?: InputMaybe<Number_Filter_Operators>;
};

export type Count_Functions = {
  __typename?: 'count_functions';
  count?: Maybe<Scalars['Int']['output']>;
};

export type Create_Arbeitskreis_Input = {
  ansprechpartner?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type Create_Auftrag_Input = {
  /** Bis wann soll der Auftrag erledigt sein? (Sinnvoll, wenn Folgearbeiten auf diesen Auftrag warten) */
  abgabetermin?: InputMaybe<Scalars['Date']['input']>;
  anmerkung?: InputMaybe<Scalars['String']['input']>;
  arbeitskreisId?: InputMaybe<Create_Arbeitskreis_Input>;
  auftraggeberId?: InputMaybe<Create_Arbeitskreis_Input>;
  auftragsartMelodie?: InputMaybe<Scalars['String']['input']>;
  auftragsartText?: InputMaybe<Scalars['String']['input']>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  melodieId?: InputMaybe<Create_Melodie_Input>;
  status?: InputMaybe<Scalars['String']['input']>;
  textId?: InputMaybe<Create_Text_Input>;
  user_created?: InputMaybe<Create_Directus_Users_Input>;
  user_updated?: InputMaybe<Create_Directus_Users_Input>;
};

export type Create_Autor_Input = {
  geburtsjahr?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  nachname: Scalars['String']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
  sterbejahr?: InputMaybe<Scalars['Int']['input']>;
  vorname?: InputMaybe<Scalars['String']['input']>;
};

export type Create_BewertungKleinerKreis_Input = {
  bezeichner?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  rangfolge?: InputMaybe<Scalars['Int']['input']>;
};

export type Create_Directus_Files_Input = {
  charset?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  duration?: InputMaybe<Scalars['Int']['input']>;
  embed?: InputMaybe<Scalars['String']['input']>;
  filename_disk?: InputMaybe<Scalars['String']['input']>;
  filename_download: Scalars['String']['input'];
  filesize?: InputMaybe<Scalars['GraphQLBigInt']['input']>;
  focal_point_x?: InputMaybe<Scalars['Int']['input']>;
  focal_point_y?: InputMaybe<Scalars['Int']['input']>;
  folder?: InputMaybe<Create_Directus_Folders_Input>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  modified_by?: InputMaybe<Create_Directus_Users_Input>;
  modified_on?: InputMaybe<Scalars['Date']['input']>;
  storage: Scalars['String']['input'];
  tags?: InputMaybe<Scalars['JSON']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  uploaded_by?: InputMaybe<Create_Directus_Users_Input>;
  uploaded_on?: InputMaybe<Scalars['Date']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type Create_Directus_Folders_Input = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  parent?: InputMaybe<Create_Directus_Folders_Input>;
};

export type Create_Directus_Roles_Input = {
  admin_access: Scalars['Boolean']['input'];
  app_access?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  enforce_tfa: Scalars['Boolean']['input'];
  icon?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ip_access?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  name: Scalars['String']['input'];
  users?: InputMaybe<Array<InputMaybe<Create_Directus_Users_Input>>>;
};

export type Create_Directus_Users_Input = {
  appearance?: InputMaybe<Scalars['String']['input']>;
  auth_data?: InputMaybe<Scalars['JSON']['input']>;
  avatar?: InputMaybe<Create_Directus_Files_Input>;
  description?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  email_notifications?: InputMaybe<Scalars['Boolean']['input']>;
  external_identifier?: InputMaybe<Scalars['String']['input']>;
  first_name?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  last_access?: InputMaybe<Scalars['Date']['input']>;
  last_name?: InputMaybe<Scalars['String']['input']>;
  last_page?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['Hash']['input']>;
  provider?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Create_Directus_Roles_Input>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Scalars['JSON']['input']>;
  tfa_secret?: InputMaybe<Scalars['Hash']['input']>;
  theme_dark?: InputMaybe<Scalars['String']['input']>;
  theme_dark_overrides?: InputMaybe<Scalars['JSON']['input']>;
  theme_light?: InputMaybe<Scalars['String']['input']>;
  theme_light_overrides?: InputMaybe<Scalars['JSON']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  token?: InputMaybe<Scalars['Hash']['input']>;
};

export type Create_Gesangbuchlied_Files_Input = {
  directus_files_id?: InputMaybe<Create_Directus_Files_Input>;
  gesangbuchlied_id?: InputMaybe<Create_Gesangbuchlied_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Create_Gesangbuchlied_Input = {
  anmerkung?: InputMaybe<Scalars['String']['input']>;
  autor_oder_copyright_checken?: InputMaybe<Scalars['Boolean']['input']>;
  bewertungAnmerkung?: InputMaybe<Scalars['String']['input']>;
  bewertungKleinerKreis?: InputMaybe<Create_BewertungKleinerKreis_Input>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  einreicherName?: InputMaybe<Scalars['String']['input']>;
  externerLink?: InputMaybe<Scalars['String']['input']>;
  gesangbuchlied_satz_mit_melodie_und_text?: InputMaybe<Array<InputMaybe<Create_Gesangbuchlied_Files_Input>>>;
  id?: InputMaybe<Scalars['ID']['input']>;
  kategorieId?: InputMaybe<Array<InputMaybe<Create_Gesangbuchlied_Kategorie_Input>>>;
  /** Der Wert wird automatisch gesetzt, wenn eine Änderung über die Gesangbuch-Webseite im Lied (Text o. Melodie) vorgenommen wurde. Ist nach Bewertung/Sichtung wieder manuell zurück zu setzen. */
  liedHatAenderung?: InputMaybe<Scalars['Boolean']['input']>;
  liednummer2000?: InputMaybe<Scalars['Int']['input']>;
  linkCloud?: InputMaybe<Scalars['String']['input']>;
  melodieGeaendert?: InputMaybe<Scalars['Boolean']['input']>;
  melodieId?: InputMaybe<Create_Melodie_Input>;
  rueckfrageAutor?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  textGeaendert?: InputMaybe<Scalars['Boolean']['input']>;
  textId?: InputMaybe<Create_Text_Input>;
  titel?: InputMaybe<Scalars['String']['input']>;
  user_created?: InputMaybe<Create_Directus_Users_Input>;
  user_updated?: InputMaybe<Create_Directus_Users_Input>;
};

export type Create_Gesangbuchlied_Kategorie_Input = {
  gesangbuchlied_id?: InputMaybe<Create_Gesangbuchlied_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
  kategorie_id?: InputMaybe<Create_Kategorie_Input>;
};

export type Create_Kategorie_Input = {
  gesangbuchliedId?: InputMaybe<Create_Gesangbuchlied_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  typ?: InputMaybe<Scalars['String']['input']>;
};

export type Create_Lizenz_Input = {
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  digital?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  print?: InputMaybe<Scalars['Boolean']['input']>;
  user_created?: InputMaybe<Create_Directus_Users_Input>;
  user_updated?: InputMaybe<Create_Directus_Users_Input>;
};

export type Create_MelodieAlternativen_Input = {
  alternativen?: InputMaybe<Array<InputMaybe<Create_MelodieAlternativen_Melodie_Input>>>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  silbenzahl?: InputMaybe<Scalars['String']['input']>;
  user_created?: InputMaybe<Create_Directus_Users_Input>;
  user_updated?: InputMaybe<Create_Directus_Users_Input>;
};

export type Create_MelodieAlternativen_Melodie_Input = {
  id?: InputMaybe<Scalars['ID']['input']>;
  melodieAlternativen_id?: InputMaybe<Create_MelodieAlternativen_Input>;
  melodie_id?: InputMaybe<Create_Melodie_Input>;
};

export type Create_Melodie_Autor_Input = {
  autor_id?: InputMaybe<Create_Autor_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
  melodie_id?: InputMaybe<Create_Melodie_Input>;
};

export type Create_Melodie_Files_Input = {
  directus_files_id?: InputMaybe<Create_Directus_Files_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
  melodie_id?: InputMaybe<Create_Melodie_Input>;
};

export type Create_Melodie_Input = {
  abc_melodie?: InputMaybe<Scalars['JSON']['input']>;
  anmerkung?: InputMaybe<Scalars['String']['input']>;
  autorId?: InputMaybe<Array<InputMaybe<Create_Melodie_Autor_Input>>>;
  bewertungAnmerkung?: InputMaybe<Scalars['String']['input']>;
  bewertungKleinerKreis?: InputMaybe<Create_BewertungKleinerKreis_Input>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  lizenzId?: InputMaybe<Create_Lizenz_Input>;
  noten?: InputMaybe<Array<InputMaybe<Create_Melodie_Files_Input>>>;
  quelle?: InputMaybe<Scalars['String']['input']>;
  quelllink?: InputMaybe<Scalars['String']['input']>;
  rueckfrageAutor?: InputMaybe<Scalars['String']['input']>;
  silben?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  titel?: InputMaybe<Scalars['String']['input']>;
  user_created?: InputMaybe<Create_Directus_Users_Input>;
  user_updated?: InputMaybe<Create_Directus_Users_Input>;
  verse?: InputMaybe<Scalars['Int']['input']>;
};

export type Create_Termin_Input = {
  arbeitskreisId?: InputMaybe<Create_Arbeitskreis_Input>;
  bemerkung?: InputMaybe<Scalars['String']['input']>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  ende?: InputMaybe<Scalars['Date']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  istMeilenstein?: InputMaybe<Scalars['Boolean']['input']>;
  sort?: InputMaybe<Scalars['Int']['input']>;
  start?: InputMaybe<Scalars['Date']['input']>;
  titel?: InputMaybe<Scalars['String']['input']>;
  user_created?: InputMaybe<Create_Directus_Users_Input>;
  user_updated?: InputMaybe<Create_Directus_Users_Input>;
};

export type Create_Text_Autor_Input = {
  autor_id?: InputMaybe<Create_Autor_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
  text_id?: InputMaybe<Create_Text_Input>;
};

export type Create_Text_Input = {
  anmerkung?: InputMaybe<Scalars['String']['input']>;
  autorId?: InputMaybe<Array<InputMaybe<Create_Text_Autor_Input>>>;
  bewertungAnmerkung?: InputMaybe<Scalars['String']['input']>;
  bewertungKleinerKreis?: InputMaybe<Create_BewertungKleinerKreis_Input>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  lizenzId?: InputMaybe<Create_Lizenz_Input>;
  quelle?: InputMaybe<Scalars['String']['input']>;
  quelllink?: InputMaybe<Scalars['String']['input']>;
  rueckfrageAutor?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  strophenEinzeln?: InputMaybe<Scalars['JSON']['input']>;
  titel?: InputMaybe<Scalars['String']['input']>;
  user_created?: InputMaybe<Create_Directus_Users_Input>;
  user_updated?: InputMaybe<Create_Directus_Users_Input>;
};

export type Date_Filter_Operators = {
  _between?: InputMaybe<Array<InputMaybe<Scalars['GraphQLStringOrFloat']['input']>>>;
  _eq?: InputMaybe<Scalars['String']['input']>;
  _gt?: InputMaybe<Scalars['String']['input']>;
  _gte?: InputMaybe<Scalars['String']['input']>;
  _in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  _lt?: InputMaybe<Scalars['String']['input']>;
  _lte?: InputMaybe<Scalars['String']['input']>;
  _nbetween?: InputMaybe<Array<InputMaybe<Scalars['GraphQLStringOrFloat']['input']>>>;
  _neq?: InputMaybe<Scalars['String']['input']>;
  _nin?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  _nnull?: InputMaybe<Scalars['Boolean']['input']>;
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Date_Function_Filter_Operators = {
  day?: InputMaybe<Number_Filter_Operators>;
  month?: InputMaybe<Number_Filter_Operators>;
  week?: InputMaybe<Number_Filter_Operators>;
  weekday?: InputMaybe<Number_Filter_Operators>;
  year?: InputMaybe<Number_Filter_Operators>;
};

export type Date_Functions = {
  __typename?: 'date_functions';
  day?: Maybe<Scalars['Int']['output']>;
  month?: Maybe<Scalars['Int']['output']>;
  week?: Maybe<Scalars['Int']['output']>;
  weekday?: Maybe<Scalars['Int']['output']>;
  year?: Maybe<Scalars['Int']['output']>;
};

export type Datetime_Function_Filter_Operators = {
  day?: InputMaybe<Number_Filter_Operators>;
  hour?: InputMaybe<Number_Filter_Operators>;
  minute?: InputMaybe<Number_Filter_Operators>;
  month?: InputMaybe<Number_Filter_Operators>;
  second?: InputMaybe<Number_Filter_Operators>;
  week?: InputMaybe<Number_Filter_Operators>;
  weekday?: InputMaybe<Number_Filter_Operators>;
  year?: InputMaybe<Number_Filter_Operators>;
};

export type Datetime_Functions = {
  __typename?: 'datetime_functions';
  day?: Maybe<Scalars['Int']['output']>;
  hour?: Maybe<Scalars['Int']['output']>;
  minute?: Maybe<Scalars['Int']['output']>;
  month?: Maybe<Scalars['Int']['output']>;
  second?: Maybe<Scalars['Int']['output']>;
  week?: Maybe<Scalars['Int']['output']>;
  weekday?: Maybe<Scalars['Int']['output']>;
  year?: Maybe<Scalars['Int']['output']>;
};

export type Delete_Many = {
  __typename?: 'delete_many';
  ids: Array<Maybe<Scalars['ID']['output']>>;
};

export type Delete_One = {
  __typename?: 'delete_one';
  id: Scalars['ID']['output'];
};

export type Directus_Activity = {
  __typename?: 'directus_activity';
  action: Scalars['String']['output'];
  collection: Scalars['String']['output'];
  comment?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  ip?: Maybe<Scalars['String']['output']>;
  item: Scalars['String']['output'];
  origin?: Maybe<Scalars['String']['output']>;
  revisions?: Maybe<Array<Maybe<Directus_Revisions>>>;
  revisions_func?: Maybe<Count_Functions>;
  timestamp?: Maybe<Scalars['Date']['output']>;
  timestamp_func?: Maybe<Datetime_Functions>;
  user?: Maybe<Directus_Users>;
  user_agent?: Maybe<Scalars['String']['output']>;
};


export type Directus_ActivityRevisionsArgs = {
  filter?: InputMaybe<Directus_Revisions_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_ActivityUserArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Activity_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Directus_Activity_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Directus_Activity_Filter>>>;
  action?: InputMaybe<String_Filter_Operators>;
  collection?: InputMaybe<String_Filter_Operators>;
  comment?: InputMaybe<String_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  ip?: InputMaybe<String_Filter_Operators>;
  item?: InputMaybe<String_Filter_Operators>;
  origin?: InputMaybe<String_Filter_Operators>;
  revisions?: InputMaybe<Directus_Revisions_Filter>;
  revisions_func?: InputMaybe<Count_Function_Filter_Operators>;
  timestamp?: InputMaybe<Date_Filter_Operators>;
  timestamp_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  user?: InputMaybe<Directus_Users_Filter>;
  user_agent?: InputMaybe<String_Filter_Operators>;
};

export type Directus_Activity_Mutated = {
  __typename?: 'directus_activity_mutated';
  data?: Maybe<Directus_Activity>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Dashboards = {
  __typename?: 'directus_dashboards';
  color?: Maybe<Scalars['String']['output']>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  note?: Maybe<Scalars['String']['output']>;
  panels?: Maybe<Array<Maybe<Directus_Panels>>>;
  panels_func?: Maybe<Count_Functions>;
  user_created?: Maybe<Directus_Users>;
};


export type Directus_DashboardsPanelsArgs = {
  filter?: InputMaybe<Directus_Panels_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_DashboardsUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Dashboards_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Directus_Dashboards_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Directus_Dashboards_Filter>>>;
  color?: InputMaybe<String_Filter_Operators>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  icon?: InputMaybe<String_Filter_Operators>;
  id?: InputMaybe<String_Filter_Operators>;
  name?: InputMaybe<String_Filter_Operators>;
  note?: InputMaybe<String_Filter_Operators>;
  panels?: InputMaybe<Directus_Panels_Filter>;
  panels_func?: InputMaybe<Count_Function_Filter_Operators>;
  user_created?: InputMaybe<Directus_Users_Filter>;
};

export type Directus_Dashboards_Mutated = {
  __typename?: 'directus_dashboards_mutated';
  data?: Maybe<Directus_Dashboards>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Files = {
  __typename?: 'directus_files';
  charset?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  duration?: Maybe<Scalars['Int']['output']>;
  embed?: Maybe<Scalars['String']['output']>;
  filename_disk?: Maybe<Scalars['String']['output']>;
  filename_download: Scalars['String']['output'];
  filesize?: Maybe<Scalars['GraphQLBigInt']['output']>;
  focal_point_x?: Maybe<Scalars['Int']['output']>;
  focal_point_y?: Maybe<Scalars['Int']['output']>;
  folder?: Maybe<Directus_Folders>;
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  location?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  metadata_func?: Maybe<Count_Functions>;
  modified_by?: Maybe<Directus_Users>;
  modified_on?: Maybe<Scalars['Date']['output']>;
  modified_on_func?: Maybe<Datetime_Functions>;
  storage: Scalars['String']['output'];
  tags?: Maybe<Scalars['JSON']['output']>;
  tags_func?: Maybe<Count_Functions>;
  title?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  uploaded_by?: Maybe<Directus_Users>;
  uploaded_on?: Maybe<Scalars['Date']['output']>;
  uploaded_on_func?: Maybe<Datetime_Functions>;
  width?: Maybe<Scalars['Int']['output']>;
};


export type Directus_FilesFolderArgs = {
  filter?: InputMaybe<Directus_Folders_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_FilesModified_ByArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_FilesUploaded_ByArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Files_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Directus_Files_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Directus_Files_Filter>>>;
  charset?: InputMaybe<String_Filter_Operators>;
  description?: InputMaybe<String_Filter_Operators>;
  duration?: InputMaybe<Number_Filter_Operators>;
  embed?: InputMaybe<String_Filter_Operators>;
  filename_disk?: InputMaybe<String_Filter_Operators>;
  filename_download?: InputMaybe<String_Filter_Operators>;
  filesize?: InputMaybe<Big_Int_Filter_Operators>;
  focal_point_x?: InputMaybe<Number_Filter_Operators>;
  focal_point_y?: InputMaybe<Number_Filter_Operators>;
  folder?: InputMaybe<Directus_Folders_Filter>;
  height?: InputMaybe<Number_Filter_Operators>;
  id?: InputMaybe<String_Filter_Operators>;
  location?: InputMaybe<String_Filter_Operators>;
  metadata?: InputMaybe<String_Filter_Operators>;
  metadata_func?: InputMaybe<Count_Function_Filter_Operators>;
  modified_by?: InputMaybe<Directus_Users_Filter>;
  modified_on?: InputMaybe<Date_Filter_Operators>;
  modified_on_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  storage?: InputMaybe<String_Filter_Operators>;
  tags?: InputMaybe<String_Filter_Operators>;
  tags_func?: InputMaybe<Count_Function_Filter_Operators>;
  title?: InputMaybe<String_Filter_Operators>;
  type?: InputMaybe<String_Filter_Operators>;
  uploaded_by?: InputMaybe<Directus_Users_Filter>;
  uploaded_on?: InputMaybe<Date_Filter_Operators>;
  uploaded_on_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  width?: InputMaybe<Number_Filter_Operators>;
};

export type Directus_Files_Mutated = {
  __typename?: 'directus_files_mutated';
  data?: Maybe<Directus_Files>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Flows = {
  __typename?: 'directus_flows';
  accountability?: Maybe<Scalars['String']['output']>;
  color?: Maybe<Scalars['String']['output']>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  operation?: Maybe<Directus_Operations>;
  operations?: Maybe<Array<Maybe<Directus_Operations>>>;
  operations_func?: Maybe<Count_Functions>;
  options?: Maybe<Scalars['JSON']['output']>;
  options_func?: Maybe<Count_Functions>;
  status?: Maybe<Scalars['String']['output']>;
  trigger?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Directus_Users>;
};


export type Directus_FlowsOperationArgs = {
  filter?: InputMaybe<Directus_Operations_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_FlowsOperationsArgs = {
  filter?: InputMaybe<Directus_Operations_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_FlowsUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Flows_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Directus_Flows_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Directus_Flows_Filter>>>;
  accountability?: InputMaybe<String_Filter_Operators>;
  color?: InputMaybe<String_Filter_Operators>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  description?: InputMaybe<String_Filter_Operators>;
  icon?: InputMaybe<String_Filter_Operators>;
  id?: InputMaybe<String_Filter_Operators>;
  name?: InputMaybe<String_Filter_Operators>;
  operation?: InputMaybe<Directus_Operations_Filter>;
  operations?: InputMaybe<Directus_Operations_Filter>;
  operations_func?: InputMaybe<Count_Function_Filter_Operators>;
  options?: InputMaybe<String_Filter_Operators>;
  options_func?: InputMaybe<Count_Function_Filter_Operators>;
  status?: InputMaybe<String_Filter_Operators>;
  trigger?: InputMaybe<String_Filter_Operators>;
  user_created?: InputMaybe<Directus_Users_Filter>;
};

export type Directus_Flows_Mutated = {
  __typename?: 'directus_flows_mutated';
  data?: Maybe<Directus_Flows>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Folders = {
  __typename?: 'directus_folders';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  parent?: Maybe<Directus_Folders>;
};


export type Directus_FoldersParentArgs = {
  filter?: InputMaybe<Directus_Folders_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Folders_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Directus_Folders_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Directus_Folders_Filter>>>;
  id?: InputMaybe<String_Filter_Operators>;
  name?: InputMaybe<String_Filter_Operators>;
  parent?: InputMaybe<Directus_Folders_Filter>;
};

export type Directus_Folders_Mutated = {
  __typename?: 'directus_folders_mutated';
  data?: Maybe<Directus_Folders>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Notifications = {
  __typename?: 'directus_notifications';
  collection?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  item?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  recipient?: Maybe<Directus_Users>;
  sender?: Maybe<Directus_Users>;
  status?: Maybe<Scalars['String']['output']>;
  subject: Scalars['String']['output'];
  timestamp?: Maybe<Scalars['Date']['output']>;
  timestamp_func?: Maybe<Datetime_Functions>;
};


export type Directus_NotificationsRecipientArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_NotificationsSenderArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Notifications_Mutated = {
  __typename?: 'directus_notifications_mutated';
  data?: Maybe<Directus_Notifications>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Operations = {
  __typename?: 'directus_operations';
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  flow?: Maybe<Directus_Flows>;
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  options?: Maybe<Scalars['JSON']['output']>;
  options_func?: Maybe<Count_Functions>;
  position_x: Scalars['Int']['output'];
  position_y: Scalars['Int']['output'];
  reject?: Maybe<Directus_Operations>;
  resolve?: Maybe<Directus_Operations>;
  type: Scalars['String']['output'];
  user_created?: Maybe<Directus_Users>;
};


export type Directus_OperationsFlowArgs = {
  filter?: InputMaybe<Directus_Flows_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_OperationsRejectArgs = {
  filter?: InputMaybe<Directus_Operations_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_OperationsResolveArgs = {
  filter?: InputMaybe<Directus_Operations_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_OperationsUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Operations_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Directus_Operations_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Directus_Operations_Filter>>>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  flow?: InputMaybe<Directus_Flows_Filter>;
  id?: InputMaybe<String_Filter_Operators>;
  key?: InputMaybe<String_Filter_Operators>;
  name?: InputMaybe<String_Filter_Operators>;
  options?: InputMaybe<String_Filter_Operators>;
  options_func?: InputMaybe<Count_Function_Filter_Operators>;
  position_x?: InputMaybe<Number_Filter_Operators>;
  position_y?: InputMaybe<Number_Filter_Operators>;
  reject?: InputMaybe<Directus_Operations_Filter>;
  resolve?: InputMaybe<Directus_Operations_Filter>;
  type?: InputMaybe<String_Filter_Operators>;
  user_created?: InputMaybe<Directus_Users_Filter>;
};

export type Directus_Operations_Mutated = {
  __typename?: 'directus_operations_mutated';
  data?: Maybe<Directus_Operations>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Panels = {
  __typename?: 'directus_panels';
  color?: Maybe<Scalars['String']['output']>;
  dashboard?: Maybe<Directus_Dashboards>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  height: Scalars['Int']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  note?: Maybe<Scalars['String']['output']>;
  options?: Maybe<Scalars['JSON']['output']>;
  options_func?: Maybe<Count_Functions>;
  position_x: Scalars['Int']['output'];
  position_y: Scalars['Int']['output'];
  show_header: Scalars['Boolean']['output'];
  type: Scalars['String']['output'];
  user_created?: Maybe<Directus_Users>;
  width: Scalars['Int']['output'];
};


export type Directus_PanelsDashboardArgs = {
  filter?: InputMaybe<Directus_Dashboards_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_PanelsUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Panels_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Directus_Panels_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Directus_Panels_Filter>>>;
  color?: InputMaybe<String_Filter_Operators>;
  dashboard?: InputMaybe<Directus_Dashboards_Filter>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  height?: InputMaybe<Number_Filter_Operators>;
  icon?: InputMaybe<String_Filter_Operators>;
  id?: InputMaybe<String_Filter_Operators>;
  name?: InputMaybe<String_Filter_Operators>;
  note?: InputMaybe<String_Filter_Operators>;
  options?: InputMaybe<String_Filter_Operators>;
  options_func?: InputMaybe<Count_Function_Filter_Operators>;
  position_x?: InputMaybe<Number_Filter_Operators>;
  position_y?: InputMaybe<Number_Filter_Operators>;
  show_header?: InputMaybe<Boolean_Filter_Operators>;
  type?: InputMaybe<String_Filter_Operators>;
  user_created?: InputMaybe<Directus_Users_Filter>;
  width?: InputMaybe<Number_Filter_Operators>;
};

export type Directus_Panels_Mutated = {
  __typename?: 'directus_panels_mutated';
  data?: Maybe<Directus_Panels>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Permissions = {
  __typename?: 'directus_permissions';
  action: Scalars['String']['output'];
  collection: Scalars['String']['output'];
  fields?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  id?: Maybe<Scalars['ID']['output']>;
  permissions?: Maybe<Scalars['JSON']['output']>;
  permissions_func?: Maybe<Count_Functions>;
  presets?: Maybe<Scalars['JSON']['output']>;
  presets_func?: Maybe<Count_Functions>;
  role?: Maybe<Directus_Roles>;
  validation?: Maybe<Scalars['JSON']['output']>;
  validation_func?: Maybe<Count_Functions>;
};


export type Directus_PermissionsRoleArgs = {
  filter?: InputMaybe<Directus_Roles_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Permissions_Mutated = {
  __typename?: 'directus_permissions_mutated';
  data?: Maybe<Directus_Permissions>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Presets = {
  __typename?: 'directus_presets';
  bookmark?: Maybe<Scalars['String']['output']>;
  collection?: Maybe<Scalars['String']['output']>;
  color?: Maybe<Scalars['String']['output']>;
  filter?: Maybe<Scalars['JSON']['output']>;
  filter_func?: Maybe<Count_Functions>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  layout?: Maybe<Scalars['String']['output']>;
  layout_options?: Maybe<Scalars['JSON']['output']>;
  layout_options_func?: Maybe<Count_Functions>;
  layout_query?: Maybe<Scalars['JSON']['output']>;
  layout_query_func?: Maybe<Count_Functions>;
  refresh_interval?: Maybe<Scalars['Int']['output']>;
  role?: Maybe<Directus_Roles>;
  search?: Maybe<Scalars['String']['output']>;
  user?: Maybe<Directus_Users>;
};


export type Directus_PresetsRoleArgs = {
  filter?: InputMaybe<Directus_Roles_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_PresetsUserArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Presets_Mutated = {
  __typename?: 'directus_presets_mutated';
  data?: Maybe<Directus_Presets>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Revisions = {
  __typename?: 'directus_revisions';
  activity?: Maybe<Directus_Activity>;
  collection: Scalars['String']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  data_func?: Maybe<Count_Functions>;
  delta?: Maybe<Scalars['JSON']['output']>;
  delta_func?: Maybe<Count_Functions>;
  id: Scalars['ID']['output'];
  item: Scalars['String']['output'];
  parent?: Maybe<Directus_Revisions>;
  version?: Maybe<Directus_Versions>;
};


export type Directus_RevisionsActivityArgs = {
  filter?: InputMaybe<Directus_Activity_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_RevisionsParentArgs = {
  filter?: InputMaybe<Directus_Revisions_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_RevisionsVersionArgs = {
  filter?: InputMaybe<Directus_Versions_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Revisions_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Directus_Revisions_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Directus_Revisions_Filter>>>;
  activity?: InputMaybe<Directus_Activity_Filter>;
  collection?: InputMaybe<String_Filter_Operators>;
  data?: InputMaybe<String_Filter_Operators>;
  data_func?: InputMaybe<Count_Function_Filter_Operators>;
  delta?: InputMaybe<String_Filter_Operators>;
  delta_func?: InputMaybe<Count_Function_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  item?: InputMaybe<String_Filter_Operators>;
  parent?: InputMaybe<Directus_Revisions_Filter>;
  version?: InputMaybe<Directus_Versions_Filter>;
};

export type Directus_Revisions_Mutated = {
  __typename?: 'directus_revisions_mutated';
  data?: Maybe<Directus_Revisions>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Roles = {
  __typename?: 'directus_roles';
  admin_access: Scalars['Boolean']['output'];
  app_access?: Maybe<Scalars['Boolean']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  enforce_tfa: Scalars['Boolean']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  ip_access?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  name: Scalars['String']['output'];
  users?: Maybe<Array<Maybe<Directus_Users>>>;
  users_func?: Maybe<Count_Functions>;
};


export type Directus_RolesUsersArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Roles_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Directus_Roles_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Directus_Roles_Filter>>>;
  admin_access?: InputMaybe<Boolean_Filter_Operators>;
  app_access?: InputMaybe<Boolean_Filter_Operators>;
  description?: InputMaybe<String_Filter_Operators>;
  enforce_tfa?: InputMaybe<Boolean_Filter_Operators>;
  icon?: InputMaybe<String_Filter_Operators>;
  id?: InputMaybe<String_Filter_Operators>;
  ip_access?: InputMaybe<String_Filter_Operators>;
  name?: InputMaybe<String_Filter_Operators>;
  users?: InputMaybe<Directus_Users_Filter>;
  users_func?: InputMaybe<Count_Function_Filter_Operators>;
};

export type Directus_Roles_Mutated = {
  __typename?: 'directus_roles_mutated';
  data?: Maybe<Directus_Roles>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Settings = {
  __typename?: 'directus_settings';
  auth_login_attempts?: Maybe<Scalars['Int']['output']>;
  auth_password_policy?: Maybe<Scalars['String']['output']>;
  basemaps?: Maybe<Scalars['JSON']['output']>;
  basemaps_func?: Maybe<Count_Functions>;
  custom_aspect_ratios?: Maybe<Scalars['JSON']['output']>;
  custom_aspect_ratios_func?: Maybe<Count_Functions>;
  custom_css?: Maybe<Scalars['String']['output']>;
  default_appearance?: Maybe<Scalars['String']['output']>;
  default_language?: Maybe<Scalars['String']['output']>;
  default_theme_dark?: Maybe<Scalars['String']['output']>;
  default_theme_light?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  mapbox_key?: Maybe<Scalars['String']['output']>;
  module_bar?: Maybe<Scalars['JSON']['output']>;
  module_bar_func?: Maybe<Count_Functions>;
  mv_hash: Scalars['String']['output'];
  mv_locked: Scalars['Boolean']['output'];
  mv_ts?: Maybe<Scalars['Date']['output']>;
  mv_ts_func?: Maybe<Datetime_Functions>;
  /** $t:field_options.directus_settings.project_color_note */
  project_color?: Maybe<Scalars['String']['output']>;
  project_descriptor?: Maybe<Scalars['String']['output']>;
  project_logo?: Maybe<Directus_Files>;
  project_name?: Maybe<Scalars['String']['output']>;
  project_url?: Maybe<Scalars['String']['output']>;
  public_background?: Maybe<Directus_Files>;
  public_favicon?: Maybe<Directus_Files>;
  public_foreground?: Maybe<Directus_Files>;
  public_note?: Maybe<Scalars['String']['output']>;
  /** $t:fields.directus_settings.public_registration_note */
  public_registration: Scalars['Boolean']['output'];
  /** $t:fields.directus_settings.public_registration_email_filter_note */
  public_registration_email_filter?: Maybe<Scalars['JSON']['output']>;
  public_registration_email_filter_func?: Maybe<Count_Functions>;
  public_registration_role?: Maybe<Directus_Roles>;
  /** $t:fields.directus_settings.public_registration_verify_email_note */
  public_registration_verify_email?: Maybe<Scalars['Boolean']['output']>;
  report_bug_url?: Maybe<Scalars['String']['output']>;
  report_error_url?: Maybe<Scalars['String']['output']>;
  report_feature_url?: Maybe<Scalars['String']['output']>;
  storage_asset_presets?: Maybe<Scalars['JSON']['output']>;
  storage_asset_presets_func?: Maybe<Count_Functions>;
  storage_asset_transform?: Maybe<Scalars['String']['output']>;
  storage_default_folder?: Maybe<Directus_Folders>;
  theme_dark_overrides?: Maybe<Scalars['JSON']['output']>;
  theme_dark_overrides_func?: Maybe<Count_Functions>;
  theme_light_overrides?: Maybe<Scalars['JSON']['output']>;
  theme_light_overrides_func?: Maybe<Count_Functions>;
};


export type Directus_SettingsProject_LogoArgs = {
  filter?: InputMaybe<Directus_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_SettingsPublic_BackgroundArgs = {
  filter?: InputMaybe<Directus_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_SettingsPublic_FaviconArgs = {
  filter?: InputMaybe<Directus_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_SettingsPublic_ForegroundArgs = {
  filter?: InputMaybe<Directus_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_SettingsPublic_Registration_RoleArgs = {
  filter?: InputMaybe<Directus_Roles_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_SettingsStorage_Default_FolderArgs = {
  filter?: InputMaybe<Directus_Folders_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Settings_Mutated = {
  __typename?: 'directus_settings_mutated';
  data?: Maybe<Directus_Settings>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Shares = {
  __typename?: 'directus_shares';
  collection: Scalars['String']['output'];
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  /** $t:shared_leave_blank_for_unlimited */
  date_end?: Maybe<Scalars['Date']['output']>;
  date_end_func?: Maybe<Datetime_Functions>;
  /** $t:shared_leave_blank_for_unlimited */
  date_start?: Maybe<Scalars['Date']['output']>;
  date_start_func?: Maybe<Datetime_Functions>;
  id: Scalars['ID']['output'];
  item: Scalars['String']['output'];
  /** $t:shared_leave_blank_for_unlimited */
  max_uses?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  /** $t:shared_leave_blank_for_passwordless_access */
  password?: Maybe<Scalars['Hash']['output']>;
  role?: Maybe<Directus_Roles>;
  times_used?: Maybe<Scalars['Int']['output']>;
  user_created?: Maybe<Directus_Users>;
};


export type Directus_SharesRoleArgs = {
  filter?: InputMaybe<Directus_Roles_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_SharesUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Shares_Mutated = {
  __typename?: 'directus_shares_mutated';
  data?: Maybe<Directus_Shares>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Translations = {
  __typename?: 'directus_translations';
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  language: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type Directus_Translations_Mutated = {
  __typename?: 'directus_translations_mutated';
  data?: Maybe<Directus_Translations>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Users = {
  __typename?: 'directus_users';
  appearance?: Maybe<Scalars['String']['output']>;
  auth_data?: Maybe<Scalars['JSON']['output']>;
  auth_data_func?: Maybe<Count_Functions>;
  avatar?: Maybe<Directus_Files>;
  description?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  email_notifications?: Maybe<Scalars['Boolean']['output']>;
  external_identifier?: Maybe<Scalars['String']['output']>;
  first_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  language?: Maybe<Scalars['String']['output']>;
  last_access?: Maybe<Scalars['Date']['output']>;
  last_access_func?: Maybe<Datetime_Functions>;
  last_name?: Maybe<Scalars['String']['output']>;
  last_page?: Maybe<Scalars['String']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  password?: Maybe<Scalars['Hash']['output']>;
  provider?: Maybe<Scalars['String']['output']>;
  role?: Maybe<Directus_Roles>;
  status?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Scalars['JSON']['output']>;
  tags_func?: Maybe<Count_Functions>;
  tfa_secret?: Maybe<Scalars['Hash']['output']>;
  theme_dark?: Maybe<Scalars['String']['output']>;
  theme_dark_overrides?: Maybe<Scalars['JSON']['output']>;
  theme_dark_overrides_func?: Maybe<Count_Functions>;
  theme_light?: Maybe<Scalars['String']['output']>;
  theme_light_overrides?: Maybe<Scalars['JSON']['output']>;
  theme_light_overrides_func?: Maybe<Count_Functions>;
  title?: Maybe<Scalars['String']['output']>;
  token?: Maybe<Scalars['Hash']['output']>;
};


export type Directus_UsersAvatarArgs = {
  filter?: InputMaybe<Directus_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_UsersRoleArgs = {
  filter?: InputMaybe<Directus_Roles_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Users_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Directus_Users_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Directus_Users_Filter>>>;
  appearance?: InputMaybe<String_Filter_Operators>;
  auth_data?: InputMaybe<String_Filter_Operators>;
  auth_data_func?: InputMaybe<Count_Function_Filter_Operators>;
  avatar?: InputMaybe<Directus_Files_Filter>;
  description?: InputMaybe<String_Filter_Operators>;
  email?: InputMaybe<String_Filter_Operators>;
  email_notifications?: InputMaybe<Boolean_Filter_Operators>;
  external_identifier?: InputMaybe<String_Filter_Operators>;
  first_name?: InputMaybe<String_Filter_Operators>;
  id?: InputMaybe<String_Filter_Operators>;
  language?: InputMaybe<String_Filter_Operators>;
  last_access?: InputMaybe<Date_Filter_Operators>;
  last_access_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  last_name?: InputMaybe<String_Filter_Operators>;
  last_page?: InputMaybe<String_Filter_Operators>;
  location?: InputMaybe<String_Filter_Operators>;
  password?: InputMaybe<Hash_Filter_Operators>;
  provider?: InputMaybe<String_Filter_Operators>;
  role?: InputMaybe<Directus_Roles_Filter>;
  status?: InputMaybe<String_Filter_Operators>;
  tags?: InputMaybe<String_Filter_Operators>;
  tags_func?: InputMaybe<Count_Function_Filter_Operators>;
  tfa_secret?: InputMaybe<Hash_Filter_Operators>;
  theme_dark?: InputMaybe<String_Filter_Operators>;
  theme_dark_overrides?: InputMaybe<String_Filter_Operators>;
  theme_dark_overrides_func?: InputMaybe<Count_Function_Filter_Operators>;
  theme_light?: InputMaybe<String_Filter_Operators>;
  theme_light_overrides?: InputMaybe<String_Filter_Operators>;
  theme_light_overrides_func?: InputMaybe<Count_Function_Filter_Operators>;
  title?: InputMaybe<String_Filter_Operators>;
  token?: InputMaybe<Hash_Filter_Operators>;
};

export type Directus_Users_Mutated = {
  __typename?: 'directus_users_mutated';
  data?: Maybe<Directus_Users>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Versions = {
  __typename?: 'directus_versions';
  collection: Scalars['String']['output'];
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  date_updated_func?: Maybe<Datetime_Functions>;
  hash?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  item: Scalars['String']['output'];
  key: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Directus_Users>;
  user_updated?: Maybe<Directus_Users>;
};


export type Directus_VersionsUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Directus_VersionsUser_UpdatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Versions_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Directus_Versions_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Directus_Versions_Filter>>>;
  collection?: InputMaybe<String_Filter_Operators>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  date_updated?: InputMaybe<Date_Filter_Operators>;
  date_updated_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  hash?: InputMaybe<String_Filter_Operators>;
  id?: InputMaybe<String_Filter_Operators>;
  item?: InputMaybe<String_Filter_Operators>;
  key?: InputMaybe<String_Filter_Operators>;
  name?: InputMaybe<String_Filter_Operators>;
  user_created?: InputMaybe<Directus_Users_Filter>;
  user_updated?: InputMaybe<Directus_Users_Filter>;
};

export type Directus_Versions_Mutated = {
  __typename?: 'directus_versions_mutated';
  data?: Maybe<Directus_Versions>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Directus_Webhooks = {
  __typename?: 'directus_webhooks';
  actions: Array<Maybe<Scalars['String']['output']>>;
  collections: Array<Maybe<Scalars['String']['output']>>;
  data?: Maybe<Scalars['Boolean']['output']>;
  headers?: Maybe<Scalars['JSON']['output']>;
  headers_func?: Maybe<Count_Functions>;
  id: Scalars['ID']['output'];
  method?: Maybe<Scalars['String']['output']>;
  migrated_flow?: Maybe<Directus_Flows>;
  name: Scalars['String']['output'];
  status?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
  was_active_before_deprecation: Scalars['Boolean']['output'];
};


export type Directus_WebhooksMigrated_FlowArgs = {
  filter?: InputMaybe<Directus_Flows_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Directus_Webhooks_Mutated = {
  __typename?: 'directus_webhooks_mutated';
  data?: Maybe<Directus_Webhooks>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Gesangbuchlied = {
  __typename?: 'gesangbuchlied';
  anmerkung?: Maybe<Scalars['String']['output']>;
  autor_oder_copyright_checken?: Maybe<Scalars['Boolean']['output']>;
  bewertungAnmerkung?: Maybe<Scalars['String']['output']>;
  bewertungKleinerKreis?: Maybe<BewertungKleinerKreis>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  date_updated_func?: Maybe<Datetime_Functions>;
  einreicherName?: Maybe<Scalars['String']['output']>;
  externerLink?: Maybe<Scalars['String']['output']>;
  gesangbuchlied_satz_mit_melodie_und_text?: Maybe<Array<Maybe<Gesangbuchlied_Files>>>;
  gesangbuchlied_satz_mit_melodie_und_text_func?: Maybe<Count_Functions>;
  id: Scalars['ID']['output'];
  kategorieId?: Maybe<Array<Maybe<Gesangbuchlied_Kategorie>>>;
  kategorieId_func?: Maybe<Count_Functions>;
  /** Der Wert wird automatisch gesetzt, wenn eine Änderung über die Gesangbuch-Webseite im Lied (Text o. Melodie) vorgenommen wurde. Ist nach Bewertung/Sichtung wieder manuell zurück zu setzen. */
  liedHatAenderung?: Maybe<Scalars['Boolean']['output']>;
  liednummer2000?: Maybe<Scalars['Int']['output']>;
  linkCloud?: Maybe<Scalars['String']['output']>;
  melodieGeaendert?: Maybe<Scalars['Boolean']['output']>;
  melodieId?: Maybe<Melodie>;
  rueckfrageAutor?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  textGeaendert?: Maybe<Scalars['Boolean']['output']>;
  textId?: Maybe<Text>;
  titel?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Directus_Users>;
  user_updated?: Maybe<Directus_Users>;
};


export type GesangbuchliedBewertungKleinerKreisArgs = {
  filter?: InputMaybe<BewertungKleinerKreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type GesangbuchliedGesangbuchlied_Satz_Mit_Melodie_Und_TextArgs = {
  filter?: InputMaybe<Gesangbuchlied_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type GesangbuchliedKategorieIdArgs = {
  filter?: InputMaybe<Gesangbuchlied_Kategorie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type GesangbuchliedMelodieIdArgs = {
  filter?: InputMaybe<Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type GesangbuchliedTextIdArgs = {
  filter?: InputMaybe<Text_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type GesangbuchliedUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type GesangbuchliedUser_UpdatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Gesangbuchlied_Aggregated = {
  __typename?: 'gesangbuchlied_aggregated';
  avg?: Maybe<Gesangbuchlied_Aggregated_Fields>;
  avgDistinct?: Maybe<Gesangbuchlied_Aggregated_Fields>;
  count?: Maybe<Gesangbuchlied_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Gesangbuchlied_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Gesangbuchlied_Aggregated_Fields>;
  min?: Maybe<Gesangbuchlied_Aggregated_Fields>;
  sum?: Maybe<Gesangbuchlied_Aggregated_Fields>;
  sumDistinct?: Maybe<Gesangbuchlied_Aggregated_Fields>;
};

export type Gesangbuchlied_Aggregated_Count = {
  __typename?: 'gesangbuchlied_aggregated_count';
  anmerkung?: Maybe<Scalars['Int']['output']>;
  autor_oder_copyright_checken?: Maybe<Scalars['Int']['output']>;
  bewertungAnmerkung?: Maybe<Scalars['Int']['output']>;
  bewertungKleinerKreis?: Maybe<Scalars['Int']['output']>;
  date_created?: Maybe<Scalars['Int']['output']>;
  date_updated?: Maybe<Scalars['Int']['output']>;
  einreicherName?: Maybe<Scalars['Int']['output']>;
  externerLink?: Maybe<Scalars['Int']['output']>;
  gesangbuchlied_satz_mit_melodie_und_text?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  kategorieId?: Maybe<Scalars['Int']['output']>;
  /** Der Wert wird automatisch gesetzt, wenn eine Änderung über die Gesangbuch-Webseite im Lied (Text o. Melodie) vorgenommen wurde. Ist nach Bewertung/Sichtung wieder manuell zurück zu setzen. */
  liedHatAenderung?: Maybe<Scalars['Int']['output']>;
  liednummer2000?: Maybe<Scalars['Int']['output']>;
  linkCloud?: Maybe<Scalars['Int']['output']>;
  melodieGeaendert?: Maybe<Scalars['Int']['output']>;
  melodieId?: Maybe<Scalars['Int']['output']>;
  rueckfrageAutor?: Maybe<Scalars['Int']['output']>;
  status?: Maybe<Scalars['Int']['output']>;
  textGeaendert?: Maybe<Scalars['Int']['output']>;
  textId?: Maybe<Scalars['Int']['output']>;
  titel?: Maybe<Scalars['Int']['output']>;
  user_created?: Maybe<Scalars['Int']['output']>;
  user_updated?: Maybe<Scalars['Int']['output']>;
};

export type Gesangbuchlied_Aggregated_Fields = {
  __typename?: 'gesangbuchlied_aggregated_fields';
  bewertungKleinerKreis?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  liednummer2000?: Maybe<Scalars['Float']['output']>;
  melodieId?: Maybe<Scalars['Float']['output']>;
  textId?: Maybe<Scalars['Float']['output']>;
};

export type Gesangbuchlied_Files = {
  __typename?: 'gesangbuchlied_files';
  directus_files_id?: Maybe<Directus_Files>;
  gesangbuchlied_id?: Maybe<Gesangbuchlied>;
  id: Scalars['ID']['output'];
};


export type Gesangbuchlied_FilesDirectus_Files_IdArgs = {
  filter?: InputMaybe<Directus_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Gesangbuchlied_FilesGesangbuchlied_IdArgs = {
  filter?: InputMaybe<Gesangbuchlied_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Gesangbuchlied_Files_Aggregated = {
  __typename?: 'gesangbuchlied_files_aggregated';
  avg?: Maybe<Gesangbuchlied_Files_Aggregated_Fields>;
  avgDistinct?: Maybe<Gesangbuchlied_Files_Aggregated_Fields>;
  count?: Maybe<Gesangbuchlied_Files_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Gesangbuchlied_Files_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Gesangbuchlied_Files_Aggregated_Fields>;
  min?: Maybe<Gesangbuchlied_Files_Aggregated_Fields>;
  sum?: Maybe<Gesangbuchlied_Files_Aggregated_Fields>;
  sumDistinct?: Maybe<Gesangbuchlied_Files_Aggregated_Fields>;
};

export type Gesangbuchlied_Files_Aggregated_Count = {
  __typename?: 'gesangbuchlied_files_aggregated_count';
  directus_files_id?: Maybe<Scalars['Int']['output']>;
  gesangbuchlied_id?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
};

export type Gesangbuchlied_Files_Aggregated_Fields = {
  __typename?: 'gesangbuchlied_files_aggregated_fields';
  gesangbuchlied_id?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
};

export type Gesangbuchlied_Files_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Gesangbuchlied_Files_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Gesangbuchlied_Files_Filter>>>;
  directus_files_id?: InputMaybe<Directus_Files_Filter>;
  gesangbuchlied_id?: InputMaybe<Gesangbuchlied_Filter>;
  id?: InputMaybe<Number_Filter_Operators>;
};

export type Gesangbuchlied_Files_Mutated = {
  __typename?: 'gesangbuchlied_files_mutated';
  data?: Maybe<Gesangbuchlied_Files>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Gesangbuchlied_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Gesangbuchlied_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Gesangbuchlied_Filter>>>;
  anmerkung?: InputMaybe<String_Filter_Operators>;
  autor_oder_copyright_checken?: InputMaybe<Boolean_Filter_Operators>;
  bewertungAnmerkung?: InputMaybe<String_Filter_Operators>;
  bewertungKleinerKreis?: InputMaybe<BewertungKleinerKreis_Filter>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  date_updated?: InputMaybe<Date_Filter_Operators>;
  date_updated_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  einreicherName?: InputMaybe<String_Filter_Operators>;
  externerLink?: InputMaybe<String_Filter_Operators>;
  gesangbuchlied_satz_mit_melodie_und_text?: InputMaybe<Gesangbuchlied_Files_Filter>;
  gesangbuchlied_satz_mit_melodie_und_text_func?: InputMaybe<Count_Function_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  kategorieId?: InputMaybe<Gesangbuchlied_Kategorie_Filter>;
  kategorieId_func?: InputMaybe<Count_Function_Filter_Operators>;
  liedHatAenderung?: InputMaybe<Boolean_Filter_Operators>;
  liednummer2000?: InputMaybe<Number_Filter_Operators>;
  linkCloud?: InputMaybe<String_Filter_Operators>;
  melodieGeaendert?: InputMaybe<Boolean_Filter_Operators>;
  melodieId?: InputMaybe<Melodie_Filter>;
  rueckfrageAutor?: InputMaybe<String_Filter_Operators>;
  status?: InputMaybe<String_Filter_Operators>;
  textGeaendert?: InputMaybe<Boolean_Filter_Operators>;
  textId?: InputMaybe<Text_Filter>;
  titel?: InputMaybe<String_Filter_Operators>;
  user_created?: InputMaybe<Directus_Users_Filter>;
  user_updated?: InputMaybe<Directus_Users_Filter>;
};

export type Gesangbuchlied_Kategorie = {
  __typename?: 'gesangbuchlied_kategorie';
  gesangbuchlied_id?: Maybe<Gesangbuchlied>;
  id: Scalars['ID']['output'];
  kategorie_id?: Maybe<Kategorie>;
};


export type Gesangbuchlied_KategorieGesangbuchlied_IdArgs = {
  filter?: InputMaybe<Gesangbuchlied_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Gesangbuchlied_KategorieKategorie_IdArgs = {
  filter?: InputMaybe<Kategorie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Gesangbuchlied_Kategorie_Aggregated = {
  __typename?: 'gesangbuchlied_kategorie_aggregated';
  avg?: Maybe<Gesangbuchlied_Kategorie_Aggregated_Fields>;
  avgDistinct?: Maybe<Gesangbuchlied_Kategorie_Aggregated_Fields>;
  count?: Maybe<Gesangbuchlied_Kategorie_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Gesangbuchlied_Kategorie_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Gesangbuchlied_Kategorie_Aggregated_Fields>;
  min?: Maybe<Gesangbuchlied_Kategorie_Aggregated_Fields>;
  sum?: Maybe<Gesangbuchlied_Kategorie_Aggregated_Fields>;
  sumDistinct?: Maybe<Gesangbuchlied_Kategorie_Aggregated_Fields>;
};

export type Gesangbuchlied_Kategorie_Aggregated_Count = {
  __typename?: 'gesangbuchlied_kategorie_aggregated_count';
  gesangbuchlied_id?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  kategorie_id?: Maybe<Scalars['Int']['output']>;
};

export type Gesangbuchlied_Kategorie_Aggregated_Fields = {
  __typename?: 'gesangbuchlied_kategorie_aggregated_fields';
  gesangbuchlied_id?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  kategorie_id?: Maybe<Scalars['Float']['output']>;
};

export type Gesangbuchlied_Kategorie_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Gesangbuchlied_Kategorie_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Gesangbuchlied_Kategorie_Filter>>>;
  gesangbuchlied_id?: InputMaybe<Gesangbuchlied_Filter>;
  id?: InputMaybe<Number_Filter_Operators>;
  kategorie_id?: InputMaybe<Kategorie_Filter>;
};

export type Gesangbuchlied_Kategorie_Mutated = {
  __typename?: 'gesangbuchlied_kategorie_mutated';
  data?: Maybe<Gesangbuchlied_Kategorie>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Gesangbuchlied_Mutated = {
  __typename?: 'gesangbuchlied_mutated';
  data?: Maybe<Gesangbuchlied>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Hash_Filter_Operators = {
  _empty?: InputMaybe<Scalars['Boolean']['input']>;
  _nempty?: InputMaybe<Scalars['Boolean']['input']>;
  _nnull?: InputMaybe<Scalars['Boolean']['input']>;
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Kategorie = {
  __typename?: 'kategorie';
  gesangbuchliedId?: Maybe<Gesangbuchlied>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  typ?: Maybe<Scalars['String']['output']>;
};


export type KategorieGesangbuchliedIdArgs = {
  filter?: InputMaybe<Gesangbuchlied_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Kategorie_Aggregated = {
  __typename?: 'kategorie_aggregated';
  avg?: Maybe<Kategorie_Aggregated_Fields>;
  avgDistinct?: Maybe<Kategorie_Aggregated_Fields>;
  count?: Maybe<Kategorie_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Kategorie_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Kategorie_Aggregated_Fields>;
  min?: Maybe<Kategorie_Aggregated_Fields>;
  sum?: Maybe<Kategorie_Aggregated_Fields>;
  sumDistinct?: Maybe<Kategorie_Aggregated_Fields>;
};

export type Kategorie_Aggregated_Count = {
  __typename?: 'kategorie_aggregated_count';
  gesangbuchliedId?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['Int']['output']>;
  typ?: Maybe<Scalars['Int']['output']>;
};

export type Kategorie_Aggregated_Fields = {
  __typename?: 'kategorie_aggregated_fields';
  gesangbuchliedId?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
};

export type Kategorie_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Kategorie_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Kategorie_Filter>>>;
  gesangbuchliedId?: InputMaybe<Gesangbuchlied_Filter>;
  id?: InputMaybe<Number_Filter_Operators>;
  name?: InputMaybe<String_Filter_Operators>;
  typ?: InputMaybe<String_Filter_Operators>;
};

export type Kategorie_Mutated = {
  __typename?: 'kategorie_mutated';
  data?: Maybe<Kategorie>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Lizenz = {
  __typename?: 'lizenz';
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  date_updated_func?: Maybe<Datetime_Functions>;
  digital?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  print?: Maybe<Scalars['Boolean']['output']>;
  user_created?: Maybe<Directus_Users>;
  user_updated?: Maybe<Directus_Users>;
};


export type LizenzUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type LizenzUser_UpdatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Lizenz_Aggregated = {
  __typename?: 'lizenz_aggregated';
  avg?: Maybe<Lizenz_Aggregated_Fields>;
  avgDistinct?: Maybe<Lizenz_Aggregated_Fields>;
  count?: Maybe<Lizenz_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Lizenz_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Lizenz_Aggregated_Fields>;
  min?: Maybe<Lizenz_Aggregated_Fields>;
  sum?: Maybe<Lizenz_Aggregated_Fields>;
  sumDistinct?: Maybe<Lizenz_Aggregated_Fields>;
};

export type Lizenz_Aggregated_Count = {
  __typename?: 'lizenz_aggregated_count';
  date_created?: Maybe<Scalars['Int']['output']>;
  date_updated?: Maybe<Scalars['Int']['output']>;
  digital?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['Int']['output']>;
  print?: Maybe<Scalars['Int']['output']>;
  user_created?: Maybe<Scalars['Int']['output']>;
  user_updated?: Maybe<Scalars['Int']['output']>;
};

export type Lizenz_Aggregated_Fields = {
  __typename?: 'lizenz_aggregated_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

export type Lizenz_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Lizenz_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Lizenz_Filter>>>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  date_updated?: InputMaybe<Date_Filter_Operators>;
  date_updated_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  digital?: InputMaybe<Boolean_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  name?: InputMaybe<String_Filter_Operators>;
  print?: InputMaybe<Boolean_Filter_Operators>;
  user_created?: InputMaybe<Directus_Users_Filter>;
  user_updated?: InputMaybe<Directus_Users_Filter>;
};

export type Lizenz_Mutated = {
  __typename?: 'lizenz_mutated';
  data?: Maybe<Lizenz>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Melodie = {
  __typename?: 'melodie';
  abc_melodie?: Maybe<Scalars['JSON']['output']>;
  abc_melodie_func?: Maybe<Count_Functions>;
  anmerkung?: Maybe<Scalars['String']['output']>;
  autorId?: Maybe<Array<Maybe<Melodie_Autor>>>;
  autorId_func?: Maybe<Count_Functions>;
  bewertungAnmerkung?: Maybe<Scalars['String']['output']>;
  bewertungKleinerKreis?: Maybe<BewertungKleinerKreis>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  date_updated_func?: Maybe<Datetime_Functions>;
  id: Scalars['ID']['output'];
  lizenzId?: Maybe<Lizenz>;
  noten?: Maybe<Array<Maybe<Melodie_Files>>>;
  noten_func?: Maybe<Count_Functions>;
  quelle?: Maybe<Scalars['String']['output']>;
  quelllink?: Maybe<Scalars['String']['output']>;
  rueckfrageAutor?: Maybe<Scalars['String']['output']>;
  silben?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  titel?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Directus_Users>;
  user_updated?: Maybe<Directus_Users>;
  verse?: Maybe<Scalars['Int']['output']>;
};


export type MelodieAutorIdArgs = {
  filter?: InputMaybe<Melodie_Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MelodieBewertungKleinerKreisArgs = {
  filter?: InputMaybe<BewertungKleinerKreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MelodieLizenzIdArgs = {
  filter?: InputMaybe<Lizenz_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MelodieNotenArgs = {
  filter?: InputMaybe<Melodie_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MelodieUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MelodieUser_UpdatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type MelodieAlternativen = {
  __typename?: 'melodieAlternativen';
  alternativen?: Maybe<Array<Maybe<MelodieAlternativen_Melodie>>>;
  alternativen_func?: Maybe<Count_Functions>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  date_updated_func?: Maybe<Datetime_Functions>;
  id: Scalars['ID']['output'];
  silbenzahl?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Directus_Users>;
  user_updated?: Maybe<Directus_Users>;
};


export type MelodieAlternativenAlternativenArgs = {
  filter?: InputMaybe<MelodieAlternativen_Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MelodieAlternativenUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MelodieAlternativenUser_UpdatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type MelodieAlternativen_Aggregated = {
  __typename?: 'melodieAlternativen_aggregated';
  avg?: Maybe<MelodieAlternativen_Aggregated_Fields>;
  avgDistinct?: Maybe<MelodieAlternativen_Aggregated_Fields>;
  count?: Maybe<MelodieAlternativen_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<MelodieAlternativen_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<MelodieAlternativen_Aggregated_Fields>;
  min?: Maybe<MelodieAlternativen_Aggregated_Fields>;
  sum?: Maybe<MelodieAlternativen_Aggregated_Fields>;
  sumDistinct?: Maybe<MelodieAlternativen_Aggregated_Fields>;
};

export type MelodieAlternativen_Aggregated_Count = {
  __typename?: 'melodieAlternativen_aggregated_count';
  alternativen?: Maybe<Scalars['Int']['output']>;
  date_created?: Maybe<Scalars['Int']['output']>;
  date_updated?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  silbenzahl?: Maybe<Scalars['Int']['output']>;
  user_created?: Maybe<Scalars['Int']['output']>;
  user_updated?: Maybe<Scalars['Int']['output']>;
};

export type MelodieAlternativen_Aggregated_Fields = {
  __typename?: 'melodieAlternativen_aggregated_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

export type MelodieAlternativen_Filter = {
  _and?: InputMaybe<Array<InputMaybe<MelodieAlternativen_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<MelodieAlternativen_Filter>>>;
  alternativen?: InputMaybe<MelodieAlternativen_Melodie_Filter>;
  alternativen_func?: InputMaybe<Count_Function_Filter_Operators>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  date_updated?: InputMaybe<Date_Filter_Operators>;
  date_updated_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  silbenzahl?: InputMaybe<String_Filter_Operators>;
  user_created?: InputMaybe<Directus_Users_Filter>;
  user_updated?: InputMaybe<Directus_Users_Filter>;
};

export type MelodieAlternativen_Melodie = {
  __typename?: 'melodieAlternativen_melodie';
  id: Scalars['ID']['output'];
  melodieAlternativen_id?: Maybe<MelodieAlternativen>;
  melodie_id?: Maybe<Melodie>;
};


export type MelodieAlternativen_MelodieMelodieAlternativen_IdArgs = {
  filter?: InputMaybe<MelodieAlternativen_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type MelodieAlternativen_MelodieMelodie_IdArgs = {
  filter?: InputMaybe<Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type MelodieAlternativen_Melodie_Aggregated = {
  __typename?: 'melodieAlternativen_melodie_aggregated';
  avg?: Maybe<MelodieAlternativen_Melodie_Aggregated_Fields>;
  avgDistinct?: Maybe<MelodieAlternativen_Melodie_Aggregated_Fields>;
  count?: Maybe<MelodieAlternativen_Melodie_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<MelodieAlternativen_Melodie_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<MelodieAlternativen_Melodie_Aggregated_Fields>;
  min?: Maybe<MelodieAlternativen_Melodie_Aggregated_Fields>;
  sum?: Maybe<MelodieAlternativen_Melodie_Aggregated_Fields>;
  sumDistinct?: Maybe<MelodieAlternativen_Melodie_Aggregated_Fields>;
};

export type MelodieAlternativen_Melodie_Aggregated_Count = {
  __typename?: 'melodieAlternativen_melodie_aggregated_count';
  id?: Maybe<Scalars['Int']['output']>;
  melodieAlternativen_id?: Maybe<Scalars['Int']['output']>;
  melodie_id?: Maybe<Scalars['Int']['output']>;
};

export type MelodieAlternativen_Melodie_Aggregated_Fields = {
  __typename?: 'melodieAlternativen_melodie_aggregated_fields';
  id?: Maybe<Scalars['Float']['output']>;
  melodieAlternativen_id?: Maybe<Scalars['Float']['output']>;
  melodie_id?: Maybe<Scalars['Float']['output']>;
};

export type MelodieAlternativen_Melodie_Filter = {
  _and?: InputMaybe<Array<InputMaybe<MelodieAlternativen_Melodie_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<MelodieAlternativen_Melodie_Filter>>>;
  id?: InputMaybe<Number_Filter_Operators>;
  melodieAlternativen_id?: InputMaybe<MelodieAlternativen_Filter>;
  melodie_id?: InputMaybe<Melodie_Filter>;
};

export type MelodieAlternativen_Melodie_Mutated = {
  __typename?: 'melodieAlternativen_melodie_mutated';
  data?: Maybe<MelodieAlternativen_Melodie>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type MelodieAlternativen_Mutated = {
  __typename?: 'melodieAlternativen_mutated';
  data?: Maybe<MelodieAlternativen>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Melodie_Aggregated = {
  __typename?: 'melodie_aggregated';
  avg?: Maybe<Melodie_Aggregated_Fields>;
  avgDistinct?: Maybe<Melodie_Aggregated_Fields>;
  count?: Maybe<Melodie_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Melodie_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Melodie_Aggregated_Fields>;
  min?: Maybe<Melodie_Aggregated_Fields>;
  sum?: Maybe<Melodie_Aggregated_Fields>;
  sumDistinct?: Maybe<Melodie_Aggregated_Fields>;
};

export type Melodie_Aggregated_Count = {
  __typename?: 'melodie_aggregated_count';
  abc_melodie?: Maybe<Scalars['Int']['output']>;
  anmerkung?: Maybe<Scalars['Int']['output']>;
  autorId?: Maybe<Scalars['Int']['output']>;
  bewertungAnmerkung?: Maybe<Scalars['Int']['output']>;
  bewertungKleinerKreis?: Maybe<Scalars['Int']['output']>;
  date_created?: Maybe<Scalars['Int']['output']>;
  date_updated?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  lizenzId?: Maybe<Scalars['Int']['output']>;
  noten?: Maybe<Scalars['Int']['output']>;
  quelle?: Maybe<Scalars['Int']['output']>;
  quelllink?: Maybe<Scalars['Int']['output']>;
  rueckfrageAutor?: Maybe<Scalars['Int']['output']>;
  silben?: Maybe<Scalars['Int']['output']>;
  status?: Maybe<Scalars['Int']['output']>;
  titel?: Maybe<Scalars['Int']['output']>;
  user_created?: Maybe<Scalars['Int']['output']>;
  user_updated?: Maybe<Scalars['Int']['output']>;
  verse?: Maybe<Scalars['Int']['output']>;
};

export type Melodie_Aggregated_Fields = {
  __typename?: 'melodie_aggregated_fields';
  bewertungKleinerKreis?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  lizenzId?: Maybe<Scalars['Float']['output']>;
  verse?: Maybe<Scalars['Float']['output']>;
};

export type Melodie_Autor = {
  __typename?: 'melodie_autor';
  autor_id?: Maybe<Autor>;
  id: Scalars['ID']['output'];
  melodie_id?: Maybe<Melodie>;
};


export type Melodie_AutorAutor_IdArgs = {
  filter?: InputMaybe<Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Melodie_AutorMelodie_IdArgs = {
  filter?: InputMaybe<Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Melodie_Autor_Aggregated = {
  __typename?: 'melodie_autor_aggregated';
  avg?: Maybe<Melodie_Autor_Aggregated_Fields>;
  avgDistinct?: Maybe<Melodie_Autor_Aggregated_Fields>;
  count?: Maybe<Melodie_Autor_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Melodie_Autor_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Melodie_Autor_Aggregated_Fields>;
  min?: Maybe<Melodie_Autor_Aggregated_Fields>;
  sum?: Maybe<Melodie_Autor_Aggregated_Fields>;
  sumDistinct?: Maybe<Melodie_Autor_Aggregated_Fields>;
};

export type Melodie_Autor_Aggregated_Count = {
  __typename?: 'melodie_autor_aggregated_count';
  autor_id?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  melodie_id?: Maybe<Scalars['Int']['output']>;
};

export type Melodie_Autor_Aggregated_Fields = {
  __typename?: 'melodie_autor_aggregated_fields';
  autor_id?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  melodie_id?: Maybe<Scalars['Float']['output']>;
};

export type Melodie_Autor_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Melodie_Autor_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Melodie_Autor_Filter>>>;
  autor_id?: InputMaybe<Autor_Filter>;
  id?: InputMaybe<Number_Filter_Operators>;
  melodie_id?: InputMaybe<Melodie_Filter>;
};

export type Melodie_Autor_Mutated = {
  __typename?: 'melodie_autor_mutated';
  data?: Maybe<Melodie_Autor>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Melodie_Files = {
  __typename?: 'melodie_files';
  directus_files_id?: Maybe<Directus_Files>;
  id: Scalars['ID']['output'];
  melodie_id?: Maybe<Melodie>;
};


export type Melodie_FilesDirectus_Files_IdArgs = {
  filter?: InputMaybe<Directus_Files_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Melodie_FilesMelodie_IdArgs = {
  filter?: InputMaybe<Melodie_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Melodie_Files_Aggregated = {
  __typename?: 'melodie_files_aggregated';
  avg?: Maybe<Melodie_Files_Aggregated_Fields>;
  avgDistinct?: Maybe<Melodie_Files_Aggregated_Fields>;
  count?: Maybe<Melodie_Files_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Melodie_Files_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Melodie_Files_Aggregated_Fields>;
  min?: Maybe<Melodie_Files_Aggregated_Fields>;
  sum?: Maybe<Melodie_Files_Aggregated_Fields>;
  sumDistinct?: Maybe<Melodie_Files_Aggregated_Fields>;
};

export type Melodie_Files_Aggregated_Count = {
  __typename?: 'melodie_files_aggregated_count';
  directus_files_id?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  melodie_id?: Maybe<Scalars['Int']['output']>;
};

export type Melodie_Files_Aggregated_Fields = {
  __typename?: 'melodie_files_aggregated_fields';
  id?: Maybe<Scalars['Float']['output']>;
  melodie_id?: Maybe<Scalars['Float']['output']>;
};

export type Melodie_Files_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Melodie_Files_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Melodie_Files_Filter>>>;
  directus_files_id?: InputMaybe<Directus_Files_Filter>;
  id?: InputMaybe<Number_Filter_Operators>;
  melodie_id?: InputMaybe<Melodie_Filter>;
};

export type Melodie_Files_Mutated = {
  __typename?: 'melodie_files_mutated';
  data?: Maybe<Melodie_Files>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Melodie_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Melodie_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Melodie_Filter>>>;
  abc_melodie?: InputMaybe<String_Filter_Operators>;
  abc_melodie_func?: InputMaybe<Count_Function_Filter_Operators>;
  anmerkung?: InputMaybe<String_Filter_Operators>;
  autorId?: InputMaybe<Melodie_Autor_Filter>;
  autorId_func?: InputMaybe<Count_Function_Filter_Operators>;
  bewertungAnmerkung?: InputMaybe<String_Filter_Operators>;
  bewertungKleinerKreis?: InputMaybe<BewertungKleinerKreis_Filter>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  date_updated?: InputMaybe<Date_Filter_Operators>;
  date_updated_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  lizenzId?: InputMaybe<Lizenz_Filter>;
  noten?: InputMaybe<Melodie_Files_Filter>;
  noten_func?: InputMaybe<Count_Function_Filter_Operators>;
  quelle?: InputMaybe<String_Filter_Operators>;
  quelllink?: InputMaybe<String_Filter_Operators>;
  rueckfrageAutor?: InputMaybe<String_Filter_Operators>;
  silben?: InputMaybe<String_Filter_Operators>;
  status?: InputMaybe<String_Filter_Operators>;
  titel?: InputMaybe<String_Filter_Operators>;
  user_created?: InputMaybe<Directus_Users_Filter>;
  user_updated?: InputMaybe<Directus_Users_Filter>;
  verse?: InputMaybe<Number_Filter_Operators>;
};

export type Melodie_Mutated = {
  __typename?: 'melodie_mutated';
  data?: Maybe<Melodie>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Number_Filter_Operators = {
  _between?: InputMaybe<Array<InputMaybe<Scalars['GraphQLStringOrFloat']['input']>>>;
  _eq?: InputMaybe<Scalars['GraphQLStringOrFloat']['input']>;
  _gt?: InputMaybe<Scalars['GraphQLStringOrFloat']['input']>;
  _gte?: InputMaybe<Scalars['GraphQLStringOrFloat']['input']>;
  _in?: InputMaybe<Array<InputMaybe<Scalars['GraphQLStringOrFloat']['input']>>>;
  _lt?: InputMaybe<Scalars['GraphQLStringOrFloat']['input']>;
  _lte?: InputMaybe<Scalars['GraphQLStringOrFloat']['input']>;
  _nbetween?: InputMaybe<Array<InputMaybe<Scalars['GraphQLStringOrFloat']['input']>>>;
  _neq?: InputMaybe<Scalars['GraphQLStringOrFloat']['input']>;
  _nin?: InputMaybe<Array<InputMaybe<Scalars['GraphQLStringOrFloat']['input']>>>;
  _nnull?: InputMaybe<Scalars['Boolean']['input']>;
  _null?: InputMaybe<Scalars['Boolean']['input']>;
};

export type String_Filter_Operators = {
  _contains?: InputMaybe<Scalars['String']['input']>;
  _empty?: InputMaybe<Scalars['Boolean']['input']>;
  _ends_with?: InputMaybe<Scalars['String']['input']>;
  _eq?: InputMaybe<Scalars['String']['input']>;
  _icontains?: InputMaybe<Scalars['String']['input']>;
  _iends_with?: InputMaybe<Scalars['String']['input']>;
  _in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  _istarts_with?: InputMaybe<Scalars['String']['input']>;
  _ncontains?: InputMaybe<Scalars['String']['input']>;
  _nempty?: InputMaybe<Scalars['Boolean']['input']>;
  _nends_with?: InputMaybe<Scalars['String']['input']>;
  _neq?: InputMaybe<Scalars['String']['input']>;
  _niends_with?: InputMaybe<Scalars['String']['input']>;
  _nin?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  _nistarts_with?: InputMaybe<Scalars['String']['input']>;
  _nnull?: InputMaybe<Scalars['Boolean']['input']>;
  _nstarts_with?: InputMaybe<Scalars['String']['input']>;
  _null?: InputMaybe<Scalars['Boolean']['input']>;
  _starts_with?: InputMaybe<Scalars['String']['input']>;
};

export type Termin = {
  __typename?: 'termin';
  arbeitskreisId?: Maybe<Arbeitskreis>;
  bemerkung?: Maybe<Scalars['String']['output']>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  date_updated_func?: Maybe<Datetime_Functions>;
  ende?: Maybe<Scalars['Date']['output']>;
  ende_func?: Maybe<Datetime_Functions>;
  id: Scalars['ID']['output'];
  istMeilenstein?: Maybe<Scalars['Boolean']['output']>;
  sort?: Maybe<Scalars['Int']['output']>;
  start?: Maybe<Scalars['Date']['output']>;
  start_func?: Maybe<Datetime_Functions>;
  titel?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Directus_Users>;
  user_updated?: Maybe<Directus_Users>;
};


export type TerminArbeitskreisIdArgs = {
  filter?: InputMaybe<Arbeitskreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type TerminUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type TerminUser_UpdatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Termin_Aggregated = {
  __typename?: 'termin_aggregated';
  avg?: Maybe<Termin_Aggregated_Fields>;
  avgDistinct?: Maybe<Termin_Aggregated_Fields>;
  count?: Maybe<Termin_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Termin_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Termin_Aggregated_Fields>;
  min?: Maybe<Termin_Aggregated_Fields>;
  sum?: Maybe<Termin_Aggregated_Fields>;
  sumDistinct?: Maybe<Termin_Aggregated_Fields>;
};

export type Termin_Aggregated_Count = {
  __typename?: 'termin_aggregated_count';
  arbeitskreisId?: Maybe<Scalars['Int']['output']>;
  bemerkung?: Maybe<Scalars['Int']['output']>;
  date_created?: Maybe<Scalars['Int']['output']>;
  date_updated?: Maybe<Scalars['Int']['output']>;
  ende?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  istMeilenstein?: Maybe<Scalars['Int']['output']>;
  sort?: Maybe<Scalars['Int']['output']>;
  start?: Maybe<Scalars['Int']['output']>;
  titel?: Maybe<Scalars['Int']['output']>;
  user_created?: Maybe<Scalars['Int']['output']>;
  user_updated?: Maybe<Scalars['Int']['output']>;
};

export type Termin_Aggregated_Fields = {
  __typename?: 'termin_aggregated_fields';
  arbeitskreisId?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  sort?: Maybe<Scalars['Float']['output']>;
};

export type Termin_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Termin_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Termin_Filter>>>;
  arbeitskreisId?: InputMaybe<Arbeitskreis_Filter>;
  bemerkung?: InputMaybe<String_Filter_Operators>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  date_updated?: InputMaybe<Date_Filter_Operators>;
  date_updated_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  ende?: InputMaybe<Date_Filter_Operators>;
  ende_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  istMeilenstein?: InputMaybe<Boolean_Filter_Operators>;
  sort?: InputMaybe<Number_Filter_Operators>;
  start?: InputMaybe<Date_Filter_Operators>;
  start_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  titel?: InputMaybe<String_Filter_Operators>;
  user_created?: InputMaybe<Directus_Users_Filter>;
  user_updated?: InputMaybe<Directus_Users_Filter>;
};

export type Termin_Mutated = {
  __typename?: 'termin_mutated';
  data?: Maybe<Termin>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Text = {
  __typename?: 'text';
  anmerkung?: Maybe<Scalars['String']['output']>;
  autorId?: Maybe<Array<Maybe<Text_Autor>>>;
  autorId_func?: Maybe<Count_Functions>;
  bewertungAnmerkung?: Maybe<Scalars['String']['output']>;
  bewertungKleinerKreis?: Maybe<BewertungKleinerKreis>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_created_func?: Maybe<Datetime_Functions>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  date_updated_func?: Maybe<Datetime_Functions>;
  id: Scalars['ID']['output'];
  lizenzId?: Maybe<Lizenz>;
  quelle?: Maybe<Scalars['String']['output']>;
  quelllink?: Maybe<Scalars['String']['output']>;
  rueckfrageAutor?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  strophenEinzeln?: Maybe<Scalars['JSON']['output']>;
  strophenEinzeln_func?: Maybe<Count_Functions>;
  titel?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Directus_Users>;
  user_updated?: Maybe<Directus_Users>;
};


export type TextAutorIdArgs = {
  filter?: InputMaybe<Text_Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type TextBewertungKleinerKreisArgs = {
  filter?: InputMaybe<BewertungKleinerKreis_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type TextLizenzIdArgs = {
  filter?: InputMaybe<Lizenz_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type TextUser_CreatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type TextUser_UpdatedArgs = {
  filter?: InputMaybe<Directus_Users_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Text_Aggregated = {
  __typename?: 'text_aggregated';
  avg?: Maybe<Text_Aggregated_Fields>;
  avgDistinct?: Maybe<Text_Aggregated_Fields>;
  count?: Maybe<Text_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Text_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Text_Aggregated_Fields>;
  min?: Maybe<Text_Aggregated_Fields>;
  sum?: Maybe<Text_Aggregated_Fields>;
  sumDistinct?: Maybe<Text_Aggregated_Fields>;
};

export type Text_Aggregated_Count = {
  __typename?: 'text_aggregated_count';
  anmerkung?: Maybe<Scalars['Int']['output']>;
  autorId?: Maybe<Scalars['Int']['output']>;
  bewertungAnmerkung?: Maybe<Scalars['Int']['output']>;
  bewertungKleinerKreis?: Maybe<Scalars['Int']['output']>;
  date_created?: Maybe<Scalars['Int']['output']>;
  date_updated?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  lizenzId?: Maybe<Scalars['Int']['output']>;
  quelle?: Maybe<Scalars['Int']['output']>;
  quelllink?: Maybe<Scalars['Int']['output']>;
  rueckfrageAutor?: Maybe<Scalars['Int']['output']>;
  status?: Maybe<Scalars['Int']['output']>;
  strophenEinzeln?: Maybe<Scalars['Int']['output']>;
  titel?: Maybe<Scalars['Int']['output']>;
  user_created?: Maybe<Scalars['Int']['output']>;
  user_updated?: Maybe<Scalars['Int']['output']>;
};

export type Text_Aggregated_Fields = {
  __typename?: 'text_aggregated_fields';
  bewertungKleinerKreis?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  lizenzId?: Maybe<Scalars['Float']['output']>;
};

export type Text_Autor = {
  __typename?: 'text_autor';
  autor_id?: Maybe<Autor>;
  id: Scalars['ID']['output'];
  text_id?: Maybe<Text>;
};


export type Text_AutorAutor_IdArgs = {
  filter?: InputMaybe<Autor_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type Text_AutorText_IdArgs = {
  filter?: InputMaybe<Text_Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Text_Autor_Aggregated = {
  __typename?: 'text_autor_aggregated';
  avg?: Maybe<Text_Autor_Aggregated_Fields>;
  avgDistinct?: Maybe<Text_Autor_Aggregated_Fields>;
  count?: Maybe<Text_Autor_Aggregated_Count>;
  countAll?: Maybe<Scalars['Int']['output']>;
  countDistinct?: Maybe<Text_Autor_Aggregated_Count>;
  group?: Maybe<Scalars['JSON']['output']>;
  max?: Maybe<Text_Autor_Aggregated_Fields>;
  min?: Maybe<Text_Autor_Aggregated_Fields>;
  sum?: Maybe<Text_Autor_Aggregated_Fields>;
  sumDistinct?: Maybe<Text_Autor_Aggregated_Fields>;
};

export type Text_Autor_Aggregated_Count = {
  __typename?: 'text_autor_aggregated_count';
  autor_id?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  text_id?: Maybe<Scalars['Int']['output']>;
};

export type Text_Autor_Aggregated_Fields = {
  __typename?: 'text_autor_aggregated_fields';
  autor_id?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  text_id?: Maybe<Scalars['Float']['output']>;
};

export type Text_Autor_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Text_Autor_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Text_Autor_Filter>>>;
  autor_id?: InputMaybe<Autor_Filter>;
  id?: InputMaybe<Number_Filter_Operators>;
  text_id?: InputMaybe<Text_Filter>;
};

export type Text_Autor_Mutated = {
  __typename?: 'text_autor_mutated';
  data?: Maybe<Text_Autor>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Text_Filter = {
  _and?: InputMaybe<Array<InputMaybe<Text_Filter>>>;
  _or?: InputMaybe<Array<InputMaybe<Text_Filter>>>;
  anmerkung?: InputMaybe<String_Filter_Operators>;
  autorId?: InputMaybe<Text_Autor_Filter>;
  autorId_func?: InputMaybe<Count_Function_Filter_Operators>;
  bewertungAnmerkung?: InputMaybe<String_Filter_Operators>;
  bewertungKleinerKreis?: InputMaybe<BewertungKleinerKreis_Filter>;
  date_created?: InputMaybe<Date_Filter_Operators>;
  date_created_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  date_updated?: InputMaybe<Date_Filter_Operators>;
  date_updated_func?: InputMaybe<Datetime_Function_Filter_Operators>;
  id?: InputMaybe<Number_Filter_Operators>;
  lizenzId?: InputMaybe<Lizenz_Filter>;
  quelle?: InputMaybe<String_Filter_Operators>;
  quelllink?: InputMaybe<String_Filter_Operators>;
  rueckfrageAutor?: InputMaybe<String_Filter_Operators>;
  status?: InputMaybe<String_Filter_Operators>;
  strophenEinzeln?: InputMaybe<String_Filter_Operators>;
  strophenEinzeln_func?: InputMaybe<Count_Function_Filter_Operators>;
  titel?: InputMaybe<String_Filter_Operators>;
  user_created?: InputMaybe<Directus_Users_Filter>;
  user_updated?: InputMaybe<Directus_Users_Filter>;
};

export type Text_Mutated = {
  __typename?: 'text_mutated';
  data?: Maybe<Text>;
  event?: Maybe<EventEnum>;
  key: Scalars['ID']['output'];
};

export type Update_Arbeitskreis_Input = {
  ansprechpartner?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type Update_Auftrag_Input = {
  /** Bis wann soll der Auftrag erledigt sein? (Sinnvoll, wenn Folgearbeiten auf diesen Auftrag warten) */
  abgabetermin?: InputMaybe<Scalars['Date']['input']>;
  anmerkung?: InputMaybe<Scalars['String']['input']>;
  arbeitskreisId?: InputMaybe<Update_Arbeitskreis_Input>;
  auftraggeberId?: InputMaybe<Update_Arbeitskreis_Input>;
  auftragsartMelodie?: InputMaybe<Scalars['String']['input']>;
  auftragsartText?: InputMaybe<Scalars['String']['input']>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  melodieId?: InputMaybe<Update_Melodie_Input>;
  status?: InputMaybe<Scalars['String']['input']>;
  textId?: InputMaybe<Update_Text_Input>;
  user_created?: InputMaybe<Update_Directus_Users_Input>;
  user_updated?: InputMaybe<Update_Directus_Users_Input>;
};

export type Update_Autor_Input = {
  geburtsjahr?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  nachname?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  sterbejahr?: InputMaybe<Scalars['Int']['input']>;
  vorname?: InputMaybe<Scalars['String']['input']>;
};

export type Update_BewertungKleinerKreis_Input = {
  bezeichner?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  rangfolge?: InputMaybe<Scalars['Int']['input']>;
};

export type Update_Directus_Files_Input = {
  charset?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  duration?: InputMaybe<Scalars['Int']['input']>;
  embed?: InputMaybe<Scalars['String']['input']>;
  filename_disk?: InputMaybe<Scalars['String']['input']>;
  filename_download?: InputMaybe<Scalars['String']['input']>;
  filesize?: InputMaybe<Scalars['GraphQLBigInt']['input']>;
  focal_point_x?: InputMaybe<Scalars['Int']['input']>;
  focal_point_y?: InputMaybe<Scalars['Int']['input']>;
  folder?: InputMaybe<Update_Directus_Folders_Input>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  modified_by?: InputMaybe<Update_Directus_Users_Input>;
  modified_on?: InputMaybe<Scalars['Date']['input']>;
  storage?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Scalars['JSON']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  uploaded_by?: InputMaybe<Update_Directus_Users_Input>;
  uploaded_on?: InputMaybe<Scalars['Date']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type Update_Directus_Folders_Input = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  parent?: InputMaybe<Update_Directus_Folders_Input>;
};

export type Update_Directus_Roles_Input = {
  admin_access?: InputMaybe<Scalars['Boolean']['input']>;
  app_access?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  enforce_tfa?: InputMaybe<Scalars['Boolean']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ip_access?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  name?: InputMaybe<Scalars['String']['input']>;
  users?: InputMaybe<Array<InputMaybe<Update_Directus_Users_Input>>>;
};

export type Update_Directus_Users_Input = {
  appearance?: InputMaybe<Scalars['String']['input']>;
  auth_data?: InputMaybe<Scalars['JSON']['input']>;
  avatar?: InputMaybe<Update_Directus_Files_Input>;
  description?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  email_notifications?: InputMaybe<Scalars['Boolean']['input']>;
  external_identifier?: InputMaybe<Scalars['String']['input']>;
  first_name?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  last_access?: InputMaybe<Scalars['Date']['input']>;
  last_name?: InputMaybe<Scalars['String']['input']>;
  last_page?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['Hash']['input']>;
  provider?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Update_Directus_Roles_Input>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Scalars['JSON']['input']>;
  tfa_secret?: InputMaybe<Scalars['Hash']['input']>;
  theme_dark?: InputMaybe<Scalars['String']['input']>;
  theme_dark_overrides?: InputMaybe<Scalars['JSON']['input']>;
  theme_light?: InputMaybe<Scalars['String']['input']>;
  theme_light_overrides?: InputMaybe<Scalars['JSON']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  token?: InputMaybe<Scalars['Hash']['input']>;
};

export type Update_Gesangbuchlied_Files_Input = {
  directus_files_id?: InputMaybe<Update_Directus_Files_Input>;
  gesangbuchlied_id?: InputMaybe<Update_Gesangbuchlied_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Update_Gesangbuchlied_Input = {
  anmerkung?: InputMaybe<Scalars['String']['input']>;
  autor_oder_copyright_checken?: InputMaybe<Scalars['Boolean']['input']>;
  bewertungAnmerkung?: InputMaybe<Scalars['String']['input']>;
  bewertungKleinerKreis?: InputMaybe<Update_BewertungKleinerKreis_Input>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  einreicherName?: InputMaybe<Scalars['String']['input']>;
  externerLink?: InputMaybe<Scalars['String']['input']>;
  gesangbuchlied_satz_mit_melodie_und_text?: InputMaybe<Array<InputMaybe<Update_Gesangbuchlied_Files_Input>>>;
  id?: InputMaybe<Scalars['ID']['input']>;
  kategorieId?: InputMaybe<Array<InputMaybe<Update_Gesangbuchlied_Kategorie_Input>>>;
  /** Der Wert wird automatisch gesetzt, wenn eine Änderung über die Gesangbuch-Webseite im Lied (Text o. Melodie) vorgenommen wurde. Ist nach Bewertung/Sichtung wieder manuell zurück zu setzen. */
  liedHatAenderung?: InputMaybe<Scalars['Boolean']['input']>;
  liednummer2000?: InputMaybe<Scalars['Int']['input']>;
  linkCloud?: InputMaybe<Scalars['String']['input']>;
  melodieGeaendert?: InputMaybe<Scalars['Boolean']['input']>;
  melodieId?: InputMaybe<Update_Melodie_Input>;
  rueckfrageAutor?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  textGeaendert?: InputMaybe<Scalars['Boolean']['input']>;
  textId?: InputMaybe<Update_Text_Input>;
  titel?: InputMaybe<Scalars['String']['input']>;
  user_created?: InputMaybe<Update_Directus_Users_Input>;
  user_updated?: InputMaybe<Update_Directus_Users_Input>;
};

export type Update_Gesangbuchlied_Kategorie_Input = {
  gesangbuchlied_id?: InputMaybe<Update_Gesangbuchlied_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
  kategorie_id?: InputMaybe<Update_Kategorie_Input>;
};

export type Update_Kategorie_Input = {
  gesangbuchliedId?: InputMaybe<Update_Gesangbuchlied_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  typ?: InputMaybe<Scalars['String']['input']>;
};

export type Update_Lizenz_Input = {
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  digital?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  print?: InputMaybe<Scalars['Boolean']['input']>;
  user_created?: InputMaybe<Update_Directus_Users_Input>;
  user_updated?: InputMaybe<Update_Directus_Users_Input>;
};

export type Update_MelodieAlternativen_Input = {
  alternativen?: InputMaybe<Array<InputMaybe<Update_MelodieAlternativen_Melodie_Input>>>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  silbenzahl?: InputMaybe<Scalars['String']['input']>;
  user_created?: InputMaybe<Update_Directus_Users_Input>;
  user_updated?: InputMaybe<Update_Directus_Users_Input>;
};

export type Update_MelodieAlternativen_Melodie_Input = {
  id?: InputMaybe<Scalars['ID']['input']>;
  melodieAlternativen_id?: InputMaybe<Update_MelodieAlternativen_Input>;
  melodie_id?: InputMaybe<Update_Melodie_Input>;
};

export type Update_Melodie_Autor_Input = {
  autor_id?: InputMaybe<Update_Autor_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
  melodie_id?: InputMaybe<Update_Melodie_Input>;
};

export type Update_Melodie_Files_Input = {
  directus_files_id?: InputMaybe<Update_Directus_Files_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
  melodie_id?: InputMaybe<Update_Melodie_Input>;
};

export type Update_Melodie_Input = {
  abc_melodie?: InputMaybe<Scalars['JSON']['input']>;
  anmerkung?: InputMaybe<Scalars['String']['input']>;
  autorId?: InputMaybe<Array<InputMaybe<Update_Melodie_Autor_Input>>>;
  bewertungAnmerkung?: InputMaybe<Scalars['String']['input']>;
  bewertungKleinerKreis?: InputMaybe<Update_BewertungKleinerKreis_Input>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  lizenzId?: InputMaybe<Update_Lizenz_Input>;
  noten?: InputMaybe<Array<InputMaybe<Update_Melodie_Files_Input>>>;
  quelle?: InputMaybe<Scalars['String']['input']>;
  quelllink?: InputMaybe<Scalars['String']['input']>;
  rueckfrageAutor?: InputMaybe<Scalars['String']['input']>;
  silben?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  titel?: InputMaybe<Scalars['String']['input']>;
  user_created?: InputMaybe<Update_Directus_Users_Input>;
  user_updated?: InputMaybe<Update_Directus_Users_Input>;
  verse?: InputMaybe<Scalars['Int']['input']>;
};

export type Update_Termin_Input = {
  arbeitskreisId?: InputMaybe<Update_Arbeitskreis_Input>;
  bemerkung?: InputMaybe<Scalars['String']['input']>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  ende?: InputMaybe<Scalars['Date']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  istMeilenstein?: InputMaybe<Scalars['Boolean']['input']>;
  sort?: InputMaybe<Scalars['Int']['input']>;
  start?: InputMaybe<Scalars['Date']['input']>;
  titel?: InputMaybe<Scalars['String']['input']>;
  user_created?: InputMaybe<Update_Directus_Users_Input>;
  user_updated?: InputMaybe<Update_Directus_Users_Input>;
};

export type Update_Text_Autor_Input = {
  autor_id?: InputMaybe<Update_Autor_Input>;
  id?: InputMaybe<Scalars['ID']['input']>;
  text_id?: InputMaybe<Update_Text_Input>;
};

export type Update_Text_Input = {
  anmerkung?: InputMaybe<Scalars['String']['input']>;
  autorId?: InputMaybe<Array<InputMaybe<Update_Text_Autor_Input>>>;
  bewertungAnmerkung?: InputMaybe<Scalars['String']['input']>;
  bewertungKleinerKreis?: InputMaybe<Update_BewertungKleinerKreis_Input>;
  date_created?: InputMaybe<Scalars['Date']['input']>;
  date_updated?: InputMaybe<Scalars['Date']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  lizenzId?: InputMaybe<Update_Lizenz_Input>;
  quelle?: InputMaybe<Scalars['String']['input']>;
  quelllink?: InputMaybe<Scalars['String']['input']>;
  rueckfrageAutor?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  strophenEinzeln?: InputMaybe<Scalars['JSON']['input']>;
  titel?: InputMaybe<Scalars['String']['input']>;
  user_created?: InputMaybe<Update_Directus_Users_Input>;
  user_updated?: InputMaybe<Update_Directus_Users_Input>;
};

export type Version_Arbeitskreis = {
  __typename?: 'version_arbeitskreis';
  ansprechpartner?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type Version_Auftrag = {
  __typename?: 'version_auftrag';
  /** Bis wann soll der Auftrag erledigt sein? (Sinnvoll, wenn Folgearbeiten auf diesen Auftrag warten) */
  abgabetermin?: Maybe<Scalars['Date']['output']>;
  anmerkung?: Maybe<Scalars['String']['output']>;
  arbeitskreisId?: Maybe<Scalars['JSON']['output']>;
  auftraggeberId?: Maybe<Scalars['JSON']['output']>;
  auftragsartMelodie?: Maybe<Scalars['String']['output']>;
  auftragsartText?: Maybe<Scalars['String']['output']>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  melodieId?: Maybe<Scalars['JSON']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  textId?: Maybe<Scalars['JSON']['output']>;
  user_created?: Maybe<Scalars['JSON']['output']>;
  user_updated?: Maybe<Scalars['JSON']['output']>;
};

export type Version_Autor = {
  __typename?: 'version_autor';
  geburtsjahr?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  nachname?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  sterbejahr?: Maybe<Scalars['Int']['output']>;
  vorname?: Maybe<Scalars['String']['output']>;
};

export type Version_BewertungKleinerKreis = {
  __typename?: 'version_bewertungKleinerKreis';
  bezeichner?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  rangfolge?: Maybe<Scalars['Int']['output']>;
};

export type Version_Gesangbuchlied = {
  __typename?: 'version_gesangbuchlied';
  anmerkung?: Maybe<Scalars['String']['output']>;
  autor_oder_copyright_checken?: Maybe<Scalars['Boolean']['output']>;
  bewertungAnmerkung?: Maybe<Scalars['String']['output']>;
  bewertungKleinerKreis?: Maybe<Scalars['JSON']['output']>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  einreicherName?: Maybe<Scalars['String']['output']>;
  externerLink?: Maybe<Scalars['String']['output']>;
  gesangbuchlied_satz_mit_melodie_und_text?: Maybe<Scalars['JSON']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  kategorieId?: Maybe<Scalars['JSON']['output']>;
  /** Der Wert wird automatisch gesetzt, wenn eine Änderung über die Gesangbuch-Webseite im Lied (Text o. Melodie) vorgenommen wurde. Ist nach Bewertung/Sichtung wieder manuell zurück zu setzen. */
  liedHatAenderung?: Maybe<Scalars['Boolean']['output']>;
  liednummer2000?: Maybe<Scalars['Int']['output']>;
  linkCloud?: Maybe<Scalars['String']['output']>;
  melodieGeaendert?: Maybe<Scalars['Boolean']['output']>;
  melodieId?: Maybe<Scalars['JSON']['output']>;
  rueckfrageAutor?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  textGeaendert?: Maybe<Scalars['Boolean']['output']>;
  textId?: Maybe<Scalars['JSON']['output']>;
  titel?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Scalars['JSON']['output']>;
  user_updated?: Maybe<Scalars['JSON']['output']>;
};

export type Version_Gesangbuchlied_Files = {
  __typename?: 'version_gesangbuchlied_files';
  directus_files_id?: Maybe<Scalars['JSON']['output']>;
  gesangbuchlied_id?: Maybe<Scalars['JSON']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
};

export type Version_Gesangbuchlied_Kategorie = {
  __typename?: 'version_gesangbuchlied_kategorie';
  gesangbuchlied_id?: Maybe<Scalars['JSON']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  kategorie_id?: Maybe<Scalars['JSON']['output']>;
};

export type Version_Kategorie = {
  __typename?: 'version_kategorie';
  gesangbuchliedId?: Maybe<Scalars['JSON']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  typ?: Maybe<Scalars['String']['output']>;
};

export type Version_Lizenz = {
  __typename?: 'version_lizenz';
  date_created?: Maybe<Scalars['Date']['output']>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  digital?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  print?: Maybe<Scalars['Boolean']['output']>;
  user_created?: Maybe<Scalars['JSON']['output']>;
  user_updated?: Maybe<Scalars['JSON']['output']>;
};

export type Version_Melodie = {
  __typename?: 'version_melodie';
  abc_melodie?: Maybe<Scalars['JSON']['output']>;
  anmerkung?: Maybe<Scalars['String']['output']>;
  autorId?: Maybe<Scalars['JSON']['output']>;
  bewertungAnmerkung?: Maybe<Scalars['String']['output']>;
  bewertungKleinerKreis?: Maybe<Scalars['JSON']['output']>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  lizenzId?: Maybe<Scalars['JSON']['output']>;
  noten?: Maybe<Scalars['JSON']['output']>;
  quelle?: Maybe<Scalars['String']['output']>;
  quelllink?: Maybe<Scalars['String']['output']>;
  rueckfrageAutor?: Maybe<Scalars['String']['output']>;
  silben?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  titel?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Scalars['JSON']['output']>;
  user_updated?: Maybe<Scalars['JSON']['output']>;
  verse?: Maybe<Scalars['Int']['output']>;
};

export type Version_MelodieAlternativen = {
  __typename?: 'version_melodieAlternativen';
  alternativen?: Maybe<Scalars['JSON']['output']>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  silbenzahl?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Scalars['JSON']['output']>;
  user_updated?: Maybe<Scalars['JSON']['output']>;
};

export type Version_MelodieAlternativen_Melodie = {
  __typename?: 'version_melodieAlternativen_melodie';
  id?: Maybe<Scalars['ID']['output']>;
  melodieAlternativen_id?: Maybe<Scalars['JSON']['output']>;
  melodie_id?: Maybe<Scalars['JSON']['output']>;
};

export type Version_Melodie_Autor = {
  __typename?: 'version_melodie_autor';
  autor_id?: Maybe<Scalars['JSON']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  melodie_id?: Maybe<Scalars['JSON']['output']>;
};

export type Version_Melodie_Files = {
  __typename?: 'version_melodie_files';
  directus_files_id?: Maybe<Scalars['JSON']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  melodie_id?: Maybe<Scalars['JSON']['output']>;
};

export type Version_Termin = {
  __typename?: 'version_termin';
  arbeitskreisId?: Maybe<Scalars['JSON']['output']>;
  bemerkung?: Maybe<Scalars['String']['output']>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  ende?: Maybe<Scalars['Date']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  istMeilenstein?: Maybe<Scalars['Boolean']['output']>;
  sort?: Maybe<Scalars['Int']['output']>;
  start?: Maybe<Scalars['Date']['output']>;
  titel?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Scalars['JSON']['output']>;
  user_updated?: Maybe<Scalars['JSON']['output']>;
};

export type Version_Text = {
  __typename?: 'version_text';
  anmerkung?: Maybe<Scalars['String']['output']>;
  autorId?: Maybe<Scalars['JSON']['output']>;
  bewertungAnmerkung?: Maybe<Scalars['String']['output']>;
  bewertungKleinerKreis?: Maybe<Scalars['JSON']['output']>;
  date_created?: Maybe<Scalars['Date']['output']>;
  date_updated?: Maybe<Scalars['Date']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  lizenzId?: Maybe<Scalars['JSON']['output']>;
  quelle?: Maybe<Scalars['String']['output']>;
  quelllink?: Maybe<Scalars['String']['output']>;
  rueckfrageAutor?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  strophenEinzeln?: Maybe<Scalars['JSON']['output']>;
  titel?: Maybe<Scalars['String']['output']>;
  user_created?: Maybe<Scalars['JSON']['output']>;
  user_updated?: Maybe<Scalars['JSON']['output']>;
};

export type Version_Text_Autor = {
  __typename?: 'version_text_autor';
  autor_id?: Maybe<Scalars['JSON']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  text_id?: Maybe<Scalars['JSON']['output']>;
};
