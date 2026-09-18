import RouteRegistryManager from '../RouteRegistryManager';

export const metadata={
  title:'Route Registry｜Admin｜LOC',
  robots:{index:false,follow:false}
};

export default function AdminRoutesPage(){
  return <main className="loc-view">
    <RouteRegistryManager/>
  </main>;
}
