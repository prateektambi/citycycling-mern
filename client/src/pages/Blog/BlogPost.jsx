import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { client, urlFor } from '../../sanityClient';
import { PortableText } from '@portabletext/react';
import { ArrowLeft, User, Calendar, Clock, Loader, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import readingTime from 'reading-time/lib/reading-time';

const BlogPost = () => {
    const { slug } = useParams();
    const location = useLocation();
    const [post, setPost] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Custom components to render rich text from Sanity
    const ptComponents = {
        types: {
            image: ({ value }) => {
                if (!value?.asset?._ref) return null;
                return (
                    <img
                        src={urlFor(value).fit('max').auto('format').url()}
                        alt={value.alt || ' '}
                        className="rounded-[2rem] my-10 w-full object-cover shadow-xl shadow-gray-200/50 border border-gray-100"
                    />
                );
            }
        },
        block: {
            h1: ({ children }) => <h1 className="text-4xl font-black text-gray-900 mt-14 mb-6 uppercase tracking-tight">{children}</h1>,
            h2: ({ children }) => <h2 className="text-3xl font-black text-gray-900 mt-12 mb-6 uppercase tracking-tight">{children}</h2>,
            h3: ({ children }) => <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">{children}</h3>,
            normal: ({ children }) => <p className="mb-6 text-gray-600 leading-relaxed text-lg lg:text-xl font-medium">{children}</p>,
            blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-600 pl-6 py-4 my-10 italic font-medium bg-blue-50/50 rounded-r-2xl text-gray-800 text-xl">
                    "{children}"
                </blockquote>
            ),
        },
        list: {
            bullet: ({ children }) => <ul className="list-disc pl-5 mb-6 space-y-3 text-gray-600 font-medium text-lg">{children}</ul>,
            number: ({ children }) => <ol className="list-decimal pl-5 mb-6 space-y-3 text-gray-600 font-medium text-lg">{children}</ol>,
        },
    };

    useEffect(() => {
        const fetchPostAndRelated = async () => {
            try {
                // 1. Fetch current post
                const postQuery = `*[slug.current == $slug][0]{
                    title,
                    slug,
                    mainImage,
                    publishedAt,
                    excerpt,
                    body,
                    "authorName": author->name,
                    "authorImage": author->image,
                    "authorBio": author->bio,
                    "categories": categories[]->{title, "slug": slug.current}
                }`;
                const postData = await client.fetch(postQuery, { slug });

                // Calculate reading time
                let textBody = '';
                if (postData?.body) {
                    textBody = postData.body
                        .filter(block => block._type === 'block' && block.children)
                        .map(block => block.children.map(child => child.text).join(''))
                        .join('\n');
                }
                const stats = readingTime(textBody);
                const currentPost = { ...postData, readTime: Math.ceil(stats.minutes) };
                setPost(currentPost);

                // 2. Fetch Related Posts (same category, excluding current post)
                if (currentPost?.categories?.length > 0) {
                    const primaryCategory = currentPost.categories[0].title;
                    const relatedQuery = `*[_type == "post" && slug.current != $slug && $category in categories[]->title] | order(publishedAt desc)[0...3] {
                        title,
                        slug,
                        mainImage,
                        publishedAt,
                        "authorName": author->name,
                        "authorImage": author->image
                    }`;
                    const relatedData = await client.fetch(relatedQuery, { slug: currentPost.slug.current, category: primaryCategory });
                    setRelatedPosts(relatedData);
                }

                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch blog post:", error);
                setLoading(false);
            }
        };

        fetchPostAndRelated();
    }, [slug]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <Loader className="animate-spin text-blue-600" size={48} />
                <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Loading Article...</p>
            </div>
        </div>
    );

    if (!post) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-6">
            <p className="text-3xl font-black text-gray-900 uppercase">Post not found</p>
            <Link to="/blog" className="text-blue-600 font-bold uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-blue-50 px-6 py-3 rounded-full transition-colors">
                <ArrowLeft size={16} /> Back to Journal
            </Link>
        </div>
    );

    // Schema.org JSON-LD for SEO
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "image": post.mainImage ? [urlFor(post.mainImage).url()] : [],
        "datePublished": post.publishedAt,
        "author": [{
            "@type": "Person",
            "name": post.authorName || "CityCycling Team"
        }]
    };

    return (
        <div className="bg-white min-h-screen pb-24 font-sans">
            <Helmet>
                <title>{post.title} | CityCycling Journal</title>
                <meta name="description" content={post.excerpt || `Read ${post.title} on the CityCycling Journal.`} />

                {/* Open Graph Tags for Social Sharing */}
                <meta property="og:title" content={post.title} />
                <meta property="og:description" content={post.excerpt} />
                <meta property="og:type" content="article" />
                {post.mainImage && <meta property="og:image" content={urlFor(post.mainImage).width(1200).height(630).url()} />}

                {/* JSON-LD Schema */}
                <script type="application/ld+json">
                    {JSON.stringify(schemaData)}
                </script>
            </Helmet>

            {/* Sticky Nav */}
            <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-gray-100 transition-all">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/blog" className="group flex items-center gap-2 text-gray-500 hover:text-blue-600 font-black text-[10px] md:text-xs uppercase tracking-widest transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        </div>
                        <span className="hidden sm:inline">Back to Journal</span>
                    </Link>

                    {/* Share Placeholder / Quick Action */}
                    <div className="text-[10px] uppercase font-black tracking-widest text-gray-400">
                        {post.readTime} Min Read
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 pt-12 md:pt-16">

                {/* Article Header */}
                <header className="space-y-6 mb-12 text-center max-w-3xl mx-auto">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {post.categories && post.categories.map(cat => (
                            <span key={cat.slug} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {cat.title}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-gray-900 tracking-tight leading-[1.05] uppercase">
                        {post.title}
                    </h1>

                    <div className="flex items-center justify-center gap-6 pt-6 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        <span className="flex items-center gap-2"><Calendar size={14} className="text-gray-300" /> {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200 hidden sm:block"></span>
                        <span className="flex items-center gap-2"><Clock size={14} className="text-gray-300" /> {post.readTime} min read</span>
                    </div>
                </header>

                {/* Hero Image */}
                {post.mainImage && (
                    <div className="mb-16 md:mb-20 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl shadow-gray-200/50 relative border-4 border-white ring-1 ring-gray-100">
                        <img
                            src={urlFor(post.mainImage).width(1200).url()}
                            alt={post.title}
                            className="w-full object-cover aspect-[16/9] md:aspect-[21/9]"
                        />
                    </div>
                )}

                {/* Content Body */}
                <article className="prose prose-lg md:prose-xl prose-blue max-w-3xl mx-auto prose-headings:font-black prose-headings:uppercase prose-p:font-medium prose-p:text-gray-600 prose-img:rounded-3xl">
                    <PortableText value={post.body} components={ptComponents} />

                    {/* Inline Nudge CTA (Placing it at the very bottom of the article text) */}
                    <div className="my-16 p-8 md:p-12 bg-gray-900 rounded-[2rem] md:rounded-[3rem] text-center relative overflow-hidden not-prose border border-gray-800 shadow-2xl shadow-gray-900/20">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 blur-[80px] rounded-full pointer-events-none"></div>

                        <div className="relative z-10 space-y-6">
                            <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Ready to hit the road?</h3>
                            <p className="text-gray-400 font-medium max-w-md mx-auto text-sm md:text-base">
                                Join the CityCycling community to easily book rentals, track your riding history, and get exclusive access to our upcoming events.
                            </p>
                            <div className="pt-4">
                                <Link
                                    to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
                                    className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest hover:bg-blue-500 hover:scale-105 transition-all shadow-xl shadow-blue-600/20 gap-2"
                                >
                                    Join the Community <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </article>

                {/* Footer Section: Author & Related Posts */}
                <footer className="max-w-3xl mx-auto mt-20 md:mt-32 space-y-20 border-t border-gray-100 pt-20">

                    {/* Author Bio Section */}
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
                        {post.authorImage ? (
                            <div className="shrink-0">
                                <img src={urlFor(post.authorImage).width(200).url()} alt={post.authorName} className="w-24 h-24 rounded-full object-cover shadow-xl shadow-gray-200/50 ring-4 ring-white border border-gray-100" />
                            </div>
                        ) : (
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 ring-4 ring-white border border-gray-100 shrink-0">
                                <User size={32} />
                            </div>
                        )}
                        <div className="space-y-3">
                            <div>
                                <h4 className="font-black text-gray-900 text-xl uppercase tracking-tight">{post.authorName || 'CityCycling Team'}</h4>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Editor • Author</span>
                            </div>
                            <p className="text-gray-500 font-medium text-sm md:text-base leading-relaxed">
                                {post.authorBio ? post.authorBio : 'Passionate cyclists and gear experts sharing knowledge, routes, and stories from the saddle. Ride with us.'}
                            </p>
                        </div>
                    </div>

                    {/* Related Posts Module */}
                    {relatedPosts.length > 0 && (
                        <div className="space-y-10 bg-gray-50 p-8 md:p-12 rounded-[3rem] border border-gray-100">
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-8">Related Stories</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {relatedPosts.map(related => (
                                    <Link
                                        to={`/blog/${related.slug.current}`}
                                        key={related.slug.current}
                                        className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 flex flex-col"
                                    >
                                        <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                                            {related.mainImage ? (
                                                <img
                                                    src={urlFor(related.mainImage).width(400).url()}
                                                    alt={related.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Image</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col">
                                            <h4 className="font-black text-gray-900 uppercase leading-snug group-hover:text-blue-600 transition-colors mb-4 line-clamp-3">
                                                {related.title}
                                            </h4>
                                            <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                <span>{new Date(related.publishedAt).toLocaleDateString()}</span>
                                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </footer>
            </main>
        </div>
    );
};

export default BlogPost;
