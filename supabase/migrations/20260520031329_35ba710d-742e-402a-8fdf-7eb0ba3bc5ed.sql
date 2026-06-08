
insert into storage.buckets (id, name, public)
values ('course-assets', 'course-assets', true)
on conflict (id) do nothing;

create policy "Public read course-assets"
on storage.objects for select
using (bucket_id = 'course-assets');

create policy "Admins upload course-assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'course-assets' and public.has_role(auth.uid(), 'admin'));

create policy "Admins update course-assets"
on storage.objects for update to authenticated
using (bucket_id = 'course-assets' and public.has_role(auth.uid(), 'admin'));

create policy "Admins delete course-assets"
on storage.objects for delete to authenticated
using (bucket_id = 'course-assets' and public.has_role(auth.uid(), 'admin'));
