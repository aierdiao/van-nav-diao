export type Category = {
  id: number;
  name: string;
  slug: string;
  sort: number;
  hidden: number;
};
export type Tag = Category;
export type Tool = {
  id: number;
  name: string;
  url: string;
  description: string;
  icon: string;
  category_id: number | null;
  sort: number;
  category_sort: number;
  hidden: number;
  tag_ids: number[];
};
export type Engine = {
  id: number;
  name: string;
  url_template: string;
  description: string;
  icon: string;
  sort: number;
  hidden: number;
};
export type Settings = {
  id: number;
  title: string;
  description: string;
  favicon: string;
  new_tab: number;
  columns: number;
  show_engines: number;
  compact: number;
  no_images: number;
  notice: string;
};
export type Dataset = {
  tools: Tool[];
  categories: Category[];
  tags: Tag[];
  search_engines: Engine[];
  settings: Settings;
};
export type Snapshot = Dataset & {
  revision: number;
  published_at: string;
  media: string[];
};
export type Publication = {
  revision: number;
  published_revision: number;
  published_at: string | null;
  last_error: string | null;
};
