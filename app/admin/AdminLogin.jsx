'use client';

import { useState } from 'react';
import { managementAuthConfigured, signInManagementWithGoogle } from '../loc/auth-client';

export default function AdminLogin(){
  const [error,setError]=useState('');
  const configured=managementAuthConfigured();

  const login=async()=>{
    setError('');
    try{
      await signInManagementWithGoogle('/admin');
    }catch(reason){
      setError(String(reason?.message||reason));
    }
  };

  return <section className="loc-card">
    <p className="loc-eyebrow">Admin Authentication</p>
    <h2>管理驗證</h2>
    <p>管理路由與所有寫入操作都需要伺服器端授權。公開頁面不具管理權限。</p>
    {!configured && <p role="alert">尚未設定 NEXT_PUBLIC_LOC_AUTH_URL。</p>}
    {configured && <button type="button" onClick={login}>使用 Google 驗證管理權限</button>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
