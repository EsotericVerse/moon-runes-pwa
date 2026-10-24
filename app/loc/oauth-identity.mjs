// Supabase Auth.getUser() verifies the access token and returns the trusted user.
// Parse the linked Google OAuth identity, not an unverified session.user.email.
export function parseVerifiedGoogleOAuthUser(user){
  if(!user?.id)throw new Error('OAuth 身分驗證失敗：找不到已確認的使用者。');
  const identity=Array.isArray(user.identities)
    ?user.identities.find(item=>item?.provider==='google'&&String(item.user_id||'')===String(user.id))
    :null;
  if(!identity)throw new Error('此登入帳號沒有經 Supabase 確認的 Google OAuth 身分。');
  const email=String(identity.identity_data?.email||'').trim().toLowerCase();
  const accountEmail=String(user.email||'').trim().toLowerCase();
  if(!email||!accountEmail||email!==accountEmail)
    throw new Error('Google OAuth Email 與 Supabase 帳號不一致，已拒絕管理授權。');
  if(identity.identity_data?.email_verified!==true)
    throw new Error('Google OAuth Email 尚未驗證，已拒絕管理授權。');
  if(!String(identity.provider_id||'').trim())
    throw new Error('Google OAuth 缺少提供者識別碼，已拒絕管理授權。');
  return Object.freeze({provider:'google',email,providerId:String(identity.provider_id),userId:String(user.id)});
}
