import SearchView from '../../loc/views/SearchView';

export const metadata={title:'搜尋｜月之符文',description:'只搜尋月之符文 Scope 的資料。'};

export default function Page(){
  return <SearchView fixedCollection="月之符文" scopeTitle="月之符文搜尋" scopeDescription="只搜尋月之符文自己的符文、語意、抽牌規則、籤詩、歷史與調和資料。" hideCollectionPicker />;
}
