class PostDetailLoader {
    constructor() {
        this.contentContainer = null;
        this.postPath = './posts/';
        this.authorsPath = './authors/authors.json';
        this.initialized = false;
        this.activeAuthor = null;
        this.recentPosts = []; // Nouvelle propriété pour stocker les recettes récentes
        this.rssConfig = {
            title: 'Delicious Posts Feed',
            description: 'Fresh Posts and cooking inspiration for Pinterest',
            link: window.location.origin,
            language: 'en-US',
            copyright: `© ${new Date().getFullYear()} Post Collection`,
            managingEditor: 'Posts@example.com (Post Team)',
            webMaster: 'webmaster@example.com (Web Master)',
            category: 'Food & Cooking',
            generator: 'PostDetailLoader RSS Generator',
            docs: 'https://www.rssboard.org/rss-specification',
            ttl: 1440, // 24 heures en minutes
            maxItems: 50
        };
    }

    async init() {
        if (this.initialized) return;

        try {
            await this.waitForContainer();
            
            if (!this.contentContainer) {
               console.error('Container #post-content not found');
                return;
            }

            // Load active author first
            await this.loadActiveAuthor();

            const postSlug = this.getpostSlugFromUrl();
            
            if (!postSlug) {
                this.showError('Post name missing from URL');
                return;
            }

           console.log('Loading Post:', postSlug);
            
            const Post = await this.loadPostData(postSlug);
            
            if (!Post) {
                this.showError(`Post "${postSlug}" not found`);
                return;
            }

            // Load recent Posts, optionally filtered by current Post's category
            await this.loadRecentPosts(Post.category_id);

            this.displayPost(Post);
            this.initialized = true;

        } catch (error) {
           console.error('Error loading Post:', error);
            this.showError('Error loading Post');
        }
    }

    // Nouvelle méthode pour créer le bouton Pinterest PIN
    createPinterestButton(imageUrl, title, description = '') {
        const pinterestUrl = this.generatePinterestUrl(imageUrl, title, description);
        
        return `
            <button class="pinterest-pin-btn" 
                    onclick="window.open('${pinterestUrl}', '_blank', 'width=750,height=320')"
                    title="Pin on Pinterest"
                    aria-label="Pin this Post image on Pinterest">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.888-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.357-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.001 24c6.624 0 11.999-5.373 11.999-12C24 5.372 18.626.001 12.001.001z"/>
                </svg>
                PIN
            </button>
        `;
    }

    // Méthode pour générer l'URL Pinterest
    generatePinterestUrl(imageUrl, title, description = '') {
        const currentUrl = window.location.href;
        const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}/${imageUrl.replace('./', '')}`;
        
        const params = new URLSearchParams({
            url: currentUrl,
            media: fullImageUrl,
            description: `${title} - ${description || 'Delicious Post to try!'}`
        });

        return `https://pinterest.com/pin/create/button/?${params.toString()}`;
    }

    // Méthode pour ajouter les styles CSS du bouton Pinterest
    addPinterestStyles() {
        const existingStyle = document.getElementById('pinterest-pin-styles');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.id = 'pinterest-pin-styles';
        style.textContent = `
            .image-container {
                position: relative;
                display: inline-block;
                overflow: hidden;
                border-radius: 12px;
            }
                
            .image-container img {
                display: block;
                width: 100%;
                height: auto;
                transition: transform 0.3s ease;
            }

            .pinterest-pin-btn {
                position: absolute;
                top: 12px;
                right: 12px;
                background: #E60023;
                color: white;
                border: none;
                border-radius: 50px;
                padding: 8px 12px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                box-shadow: 0 2px 8px rgba(230, 0, 35, 0.3);
                transition: all 0.2s ease;                
                transform: translateY(-5px);
                z-index: 10;
            }

            .pinterest-pin-btn:hover {
                background: #AD081B;
                box-shadow: 0 4px 12px rgba(230, 0, 35, 0.4);
                transform: translateY(-2px);
            }

            .pinterest-pin-btn svg {
                width: 14px;
                height: 14px;
            }

            .image-container:hover .pinterest-pin-btn {
                opacity: ;
                transform: translateY(0);
            }
                

            .image-container:hover img {
                transform: scale(1.02);
            }

            /* Styles pour les images dans les mini-recettes */
            .mini-Post {
                position: relative;
            }

            .mini-Post .pinterest-pin-btn {
                top: 8px;
                right: 8px;
                padding: 6px 8px;
                font-size: 10px;
            }

            .mini-Post .pinterest-pin-btn svg {
                width: 12px;
                height: 12px;
            }

            /* Styles pour les images dans le contenu structuré */
            .content-image {
                position: relative;
                margin: 20px 0;
            }

            .content-image .image-container {
                width: 100%;
            }

            /* Animation d'apparition */
            @keyframes pinFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .image-container:hover .pinterest-pin-btn {
                animation: pinFadeIn 0.2s ease-out;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Nouvelle méthode pour encapsuler les images avec le conteneur Pinterest
    wrapImageWithPinterestButton(imageHtml, title, description = '', imageUrl = '') {
        // Extraire l'URL de l'image du HTML si elle n'est pas fournie
        if (!imageUrl) {
            const imgMatch = imageHtml.match(/src=["']([^"']+)["']/);
            imageUrl = imgMatch ? imgMatch[1] : '';
        }

        // Extraire le contenu de la balise img
        const imgContent = imageHtml.match(/<img[^>]*>/i)?.[0] || imageHtml;
        
        return `
            <div class="image-container">
                ${imgContent}
                ${this.createPinterestButton(imageUrl, title, description)}
            </div>
        `;
    }

    // Nouvelle méthode pour générer et intégrer le feed RSS automatiquement
    async generateAndIntegrateRSS() {
        try {
           console.log('Integrating RSS feed for Pinterest auto-discovery...');

            // Charger toutes les recettes disponibles
            const PostFolders = await this.getPostFolders();
            const PostPromises = PostFolders.slice(0, this.rssConfig.maxItems).map(folder => 
                this.loadPostDataForRSS(folder)
            );
            
            const Posts = await Promise.all(PostPromises);
            const validPosts = Posts.filter(Post => Post !== null);

            // Trier par date (plus récentes d'abord)
            validPosts.sort((a, b) => {
                const dateA = new Date(a.publishDate || a.createdAt || a.updatedAt || '2023-01-01');
                const dateB = new Date(b.publishDate || b.createdAt || b.updatedAt || '2023-01-01');
                return dateB - dateA;
            });

            // Générer le XML RSS
            const rssXml = this.buildRSSXML(validPosts);
            
            // Intégrer le RSS dans la page
            this.integrateRSSInPage(rssXml, validPosts);
            
            // Ajouter les meta tags pour Pinterest
            this.addPinterestMetaTags(validPosts);
            
            return rssXml;
            
        } catch (error) {
           console.error('Error integrating RSS feed:', error);
            return null;
        }
    }

    // Intégrer le RSS directement dans la page
    integrateRSSInPage(rssXml, Posts) {
        // Créer un endpoint RSS virtuel accessible via JavaScript
        window.rssFeedData = {
            xml: rssXml,
            Posts: Posts,
            generated: new Date().toISOString(),
            url: `${window.location.origin}/rss.xml`
        };

        // Créer un blob URL pour le RSS accessible
        const blob = new Blob([rssXml], { type: 'application/rss+xml;charset=utf-8' });
        window.rssUrl = URL.createObjectURL(blob);

        // Ajouter le lien RSS dans le head pour auto-découverte
        this.addRSSLinkToHead();
        
        // Créer un endpoint virtuel que Pinterest peut appeler
        this.createVirtualRSSEndpoint(rssXml);
        
    //    console.log('RSS feed integrated successfully!', {
    //         PostsCount: Posts.length,
    //         rssUrl: window.rssFeedData.url,
    //         virtualUrl: window.rssUrl
    //     });
    }

    // Ajouter le lien RSS dans le head pour auto-découverte par Pinterest
    addRSSLinkToHead() {
        // Supprimer l'ancien lien RSS s'il existe
        const existingLink = document.querySelector('link[type="application/rss+xml"]');
        if (existingLink) {
            existingLink.remove();
        }

        // Ajouter le nouveau lien RSS
        const rssLink = document.createElement('link');
        rssLink.rel = 'alternate';
        rssLink.type = 'application/rss+xml';
        rssLink.title = this.rssConfig.title;
        rssLink.href = '/rss.xml'; // Pinterest cherchera automatiquement ici
        
        document.head.appendChild(rssLink);

        // Ajouter aussi un lien canonique RSS
        const rssCanonical = document.createElement('link');
        rssCanonical.rel = 'alternate';
        rssCanonical.type = 'application/rss+xml';
        rssCanonical.title = 'Pinterest Post Feed';
        rssCanonical.href = `${window.location.origin}/pinterest-rss.xml`;
        
        document.head.appendChild(rssCanonical);
    }

    // Créer un endpoint RSS virtuel
    createVirtualRSSEndpoint(rssXml) {
        // Intercepter les requêtes vers /rss.xml
        if ('serviceWorker' in navigator) {
            // Enregistrer un service worker simple pour servir le RSS
            const swCode = `
                self.addEventListener('fetch', function(event) {
                    if (event.request.url.endsWith('/rss.xml') || event.request.url.endsWith('/pinterest-rss.xml')) {
                        event.respondWith(
                            new Response(\`${rssXml.replace(/`/g, '\\`')}\`, {
                                headers: {
                                    'Content-Type': 'application/rss+xml;charset=utf-8',
                                    'Access-Control-Allow-Origin': '*',
                                    'Access-Control-Allow-Methods': 'GET',
                                    'Cache-Control': 'public, max-age=3600'
                                }
                            })
                        );
                    }
                });
            `;
            
            const blob = new Blob([swCode], { type: 'application/javascript' });
            const swUrl = URL.createObjectURL(blob);
            
            navigator.serviceWorker.register(swUrl).then(() => {
               console.log('RSS Service Worker registered successfully');
            }).catch(error => {
               console.log('RSS Service Worker registration failed:', error);
            });
        }
        
        // Fallback : stocker dans window pour accès direct
        window.getRSSFeed = () => rssXml;
    }

    // Ajouter les meta tags Pinterest pour meilleure découverte
    addPinterestMetaTags(Posts) {
        const metaTags = [
            { property: 'og:type', content: 'website' },
            { property: 'og:site_name', content: this.rssConfig.title },
            { name: 'pinterest-rich-pin', content: 'true' },
            { name: 'pinterest:feed', content: '/rss.xml' },
            { name: 'pinterest:Posts', content: Posts.length.toString() },
            { name: 'pinterest:updated', content: new Date().toISOString() },
            { name: 'robots', content: 'index,follow' },
            { name: 'pinterest-verification', content: 'pinterest-Posts-feed' }
        ];

        metaTags.forEach(tag => {
            const existingMeta = document.querySelector(
                tag.property ? `meta[property="${tag.property}"]` : `meta[name="${tag.name}"]`
            );
            
            if (existingMeta) {
                existingMeta.remove();
            }

            const meta = document.createElement('meta');
            if (tag.property) {
                meta.setAttribute('property', tag.property);
            } else {
                meta.setAttribute('name', tag.name);
            }
            meta.setAttribute('content', tag.content);
            document.head.appendChild(meta);
        });

        // Ajouter un script JSON-LD pour structured data
        this.addStructuredData(Posts);
    }

    // Ajouter les données structurées JSON-LD pour Pinterest et Google
    addStructuredData(Posts) {
        const existingScript = document.getElementById('Post-structured-data');
        if (existingScript) {
            existingScript.remove();
        }

        const structuredData = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": this.rssConfig.title,
            "url": window.location.origin,
            "description": this.rssConfig.description,
            "potentialAction": {
                "@type": "SearchAction",
                "target": `${window.location.origin}/?search={search_term}`,
                "query-input": "required name=search_term"
            },
            "mainEntity": {
                "@type": "ItemList",
                "numberOfItems": Posts.length,
                "itemListElement": Posts.slice(0, 10).map((Post, index) => ({
                    "@type": "Post",
                    "position": index + 1,
                    "name": Post.title,
                    "image": Post.mainImage,
                    "description": Post.description,
                    "url": Post.link,
                    "prepTime": `PT${Post.prepTime}M`,
                    "cookTime": `PT${Post.cookTime}M`,
                    "totalTime": `PT${Post.totalTime}M`,
                    "PostYield": Post.servings,
                    "PostIngredient": Post.ingredients,
                    "PostInstructions": Post.instructions.map(instruction => ({
                        "@type": "HowToStep",
                        "text": instruction
                    })),
                    "nutrition": {
                        "@type": "NutritionInformation",
                        "servingSize": Post.servings
                    },
                    "author": {
                        "@type": "Person",
                        "name": Post.author
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": this.rssConfig.title
                    }
                }))
            }
        };

        const script = document.createElement('script');
        script.id = 'Post-structured-data';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(structuredData, null, 2);
        document.head.appendChild(script);
    }

    // Méthode pour créer le statut RSS intégré
    createRSSStatus() {
        return `
            <div class="rss-integrated-status">
                <div class="rss-status-header">
                    <span class="status-icon">🟢</span>
                    <strong>RSS Active</strong>
                </div>
                <div class="rss-details">
                    <p>✅ RSS feed integrated in page</p>
                    <p>🔗 Auto-discovery enabled</p>
                    <p>📌 Pinterest meta tags added</p>
                    <p>🤖 Service worker endpoint ready</p>
                </div>
                <div class="rss-endpoints">
                    <div class="endpoint-item">
                        <code>/rss.xml</code>
                        <span class="endpoint-status">Active</span>
                    </div>
                    <div class="endpoint-item">
                        <code>/pinterest-rss.xml</code>
                        <span class="endpoint-status">Active</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Méthode pour créer le bouton de test RSS
    createRSSTestButton() {
        return `
            <button class="rss-test-btn" 
                    onclick="window.PostDetailLoader.testRSSEndpoints()"
                    title="Test RSS endpoints">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Test RSS
            </button>
        `;
    }

    // Méthode pour tester les endpoints RSS
    async testRSSEndpoints() {
        const endpoints = ['/rss.xml', '/pinterest-rss.xml'];
        const results = [];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                results.push({
                    endpoint,
                    status: response.status,
                    ok: response.ok,
                    contentType: response.headers.get('content-type')
                });
            } catch (error) {
                results.push({
                    endpoint,
                    status: 'Error',
                    ok: false,
                    error: error.message
                });
            }
        }
        
       console.log('RSS Endpoints Test Results:', results);
        
        // Afficher les résultats dans une alerte
        const resultText = results.map(r => 
            `${r.endpoint}: ${r.ok ? '✅ OK' : '❌ Error'} (${r.status})`
        ).join('\n');
        
        alert(`RSS Endpoints Test:\n\n${resultText}\n\nCheck console for details`);
        
        return results;
    }

    // Charger les données d'une recette optimisées pour RSS
    async loadPostDataForRSS(folderName) {
        try {
            const jsonUrl = `${this.postPath}${folderName}/Post.json`;
            const jsonResponse = await fetch(jsonUrl);
            
            if (!jsonResponse.ok) {
                return null;
            }
            
            const PostData = await jsonResponse.json();
            
            if (!PostData.title) {
                return null;
            }

            // Construire l'URL complète de la recette
            const PostUrl = `${window.location.origin}${window.location.pathname}?page=post-detail&Post=${folderName}`;
            
            // Obtenir l'image principale
            const mainImage = this.getMainImage(PostData, folderName);
            const fullImageUrl = mainImage.startsWith('http') ? mainImage : `${window.location.origin}/${mainImage.replace('./', '')}`;
            
            // Calculer le temps total si nécessaire
            const totalTime = PostData.total_time || 
                             ((PostData.prep_time || 0) + (PostData.cook_time || 0)) || 
                             30; // défaut 30 minutes

            return {
                title: PostData.title,
                description: this.createRSSDescription(PostData),
                link: PostUrl,
                guid: PostUrl,
                publishDate: PostData.createdAt || PostData.updatedAt || new Date().toISOString(),
                category: PostData.category || 'Posts',
                author: this.activeAuthor?.name || 'House Chef',
                mainImage: fullImageUrl,
                prepTime: PostData.prep_time || 15,
                cookTime: PostData.cook_time || 30,
                totalTime: totalTime,
                servings: PostData.servings || '4-6',
                difficulty: PostData.difficulty || 'intermediate',
                ingredients: PostData.ingredients || [],
                instructions: PostData.instructions || [],
                tags: this.extractTags(PostData),
                nutrition: PostData.nutrition || {},
                ...PostData
            };
            
        } catch (error) {
           console.error(`Erreur lors du chargement RSS de la recette ${folderName}:`, error);
            return null;
        }
    }

    // Créer une description optimisée pour Pinterest
    createRSSDescription(PostData) {
        const parts = [];
        
        if (PostData.description) {
            parts.push(PostData.description);
        }
        
        // Ajouter les informations de temps
        const timeInfo = [];
        if (PostData.prep_time) timeInfo.push(`Prep: ${PostData.prep_time}min`);
        if (PostData.cook_time) timeInfo.push(`Cook: ${PostData.cook_time}min`);
        if (PostData.servings) timeInfo.push(`Serves: ${PostData.servings}`);
        
        if (timeInfo.length > 0) {
            parts.push(`⏱️ ${timeInfo.join(' | ')}`);
        }
        
        // Ajouter quelques ingrédients clés
        if (PostData.ingredients && PostData.ingredients.length > 0) {
            const keyIngredients = PostData.ingredients.slice(0, 3).join(', ');
            parts.push(`🥘 Key ingredients: ${keyIngredients}`);
        }
        
        // Ajouter des hashtags Pinterest-friendly
        const tags = this.extractTags(PostData);
        if (tags.length > 0) {
            parts.push(`#${tags.slice(0, 5).join(' #')}`);
        }
        
        return parts.join(' | ');
    }

    // Extraire des tags pour Pinterest
    extractTags(PostData) {
        const tags = new Set();
        
        // Tags basés sur la catégorie
        if (PostData.category) {
            tags.add(PostData.category.replace(/\s+/g, ''));
        }
        
        if (PostData.category_id) {
            tags.add(PostData.category_id.replace(/-/g, ''));
        }
        
        // Tags basés sur la difficulté
        if (PostData.difficulty) {
            tags.add(`${PostData.difficulty}Post`);
        }
        
        // Tags basés sur le temps
        const totalTime = PostData.total_time || ((PostData.prep_time || 0) + (PostData.cook_time || 0));
        if (totalTime <= 30) {
            tags.add('quickPost');
            tags.add('30minutemeals');
        } else if (totalTime <= 60) {
            tags.add('1hourmeals');
        }
        
        // Tags basés sur les ingrédients principaux
        if (PostData.ingredients) {
            PostData.ingredients.slice(0, 3).forEach(ingredient => {
                const words = ingredient.toLowerCase().split(' ');
                words.forEach(word => {
                    if (word.length > 4 && !['cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds'].includes(word)) {
                        tags.add(word.replace(/[^a-zA-Z]/g, ''));
                    }
                });
            });
        }
        
        // Tags génériques populaires
        tags.add('Post');
        tags.add('cooking');
        tags.add('foodie');
        tags.add('homemade');
        tags.add('delicious');
        
        return Array.from(tags).filter(tag => tag.length > 2).slice(0, 10);
    }

    // Construire le XML RSS complet
    buildRSSXML(Posts) {
        const now = new Date();
        const pubDate = now.toUTCString();
        
        const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>
<rss version="2.0" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">`;

        const channelHeader = `
    <channel>
        <title>${this.escapeXML(this.rssConfig.title)}</title>
        <link>${this.escapeXML(this.rssConfig.link)}</link>
        <description>${this.escapeXML(this.rssConfig.description)}</description>
        <language>${this.rssConfig.language}</language>
        <copyright>${this.escapeXML(this.rssConfig.copyright)}</copyright>
        <managingEditor>${this.escapeXML(this.rssConfig.managingEditor)}</managingEditor>
        <webMaster>${this.escapeXML(this.rssConfig.webMaster)}</webMaster>
        <pubDate>${pubDate}</pubDate>
        <lastBuildDate>${pubDate}</lastBuildDate>
        <category>${this.escapeXML(this.rssConfig.category)}</category>
        <generator>${this.escapeXML(this.rssConfig.generator)}</generator>
        <docs>${this.rssConfig.docs}</docs>
        <ttl>${this.rssConfig.ttl}</ttl>
        <atom:link href="${this.rssConfig.link}/rss.xml" rel="self" type="application/rss+xml" />
        
        <!-- Pinterest-specific elements -->
        <image>
            <url>${this.rssConfig.link}/images/logo.png</url>
            <title>${this.escapeXML(this.rssConfig.title)}</title>
            <link>${this.escapeXML(this.rssConfig.link)}</link>
            <width>144</width>
            <height>144</height>
        </image>`;

        const items = Posts.map(Post => this.buildRSSItem(Post)).join('\n');
        
        const xmlFooter = `
    </channel>
</rss>`;

        return xmlHeader + channelHeader + items + xmlFooter;
    }

    // Construire un item RSS pour une recette
    buildRSSItem(Post) {
        const pubDate = new Date(Post.publishDate).toUTCString();
        
        // Construire le contenu HTML enrichi pour Pinterest
        const contentHtml = this.buildPostContentHTML(Post);
        
        return `
        <item>
            <title>${this.escapeXML(Post.title)}</title>
            <link>${this.escapeXML(Post.link)}</link>
            <description>${this.escapeXML(Post.description)}</description>
            <pubDate>${pubDate}</pubDate>
            <guid isPermaLink="true">${this.escapeXML(Post.guid)}</guid>
            <category>${this.escapeXML(Post.category)}</category>
            <dc:creator>${this.escapeXML(Post.author)}</dc:creator>
            
            <!-- Contenu HTML enrichi -->
            <content:encoded><![CDATA[${contentHtml}]]></content:encoded>
            
            <!-- Image principale -->
            <media:content url="${this.escapeXML(Post.mainImage)}" medium="image" type="image/jpeg">
                <media:title>${this.escapeXML(Post.title)}</media:title>
                <media:description>${this.escapeXML(Post.description)}</media:description>
            </media:content>
            
            <!-- Métadonnées de recette -->
            <media:group>
                <media:category>Post</media:category>
                <media:keywords>${Post.tags.join(', ')}</media:keywords>
            </media:group>
            
            <!-- Informations structurées pour Pinterest -->
            <media:community>
                <media:statistics views="0" favorites="0"/>
                <media:tags>${Post.tags.join(' ')}</media:tags>
            </media:community>
        </item>`;
    }

    // Construire le contenu HTML enrichi pour Pinterest
    buildPostContentHTML(Post) {
        const html = `
        <div class="post-content">
            <img src="${Post.mainImage}" alt="${Post.title}" style="width:100%;max-width:600px;height:auto;border-radius:8px;margin-bottom:20px;">
            
            <div class="Post-meta" style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:20px;">
                <p><strong>⏱️ Prep Time:</strong> ${Post.prepTime} minutes</p>
                <p><strong>🍳 Cook Time:</strong> ${Post.cookTime} minutes</p>
                <p><strong>⏰ Total Time:</strong> ${Post.totalTime} minutes</p>
                <p><strong>🍽️ Servings:</strong> ${Post.servings}</p>
                <p><strong>📊 Difficulty:</strong> ${Post.difficulty}</p>
            </div>
            
            <div class="ingredients" style="margin-bottom:30px;">
                <h3 style="color:#E60023;border-bottom:2px solid #E60023;padding-bottom:5px;">🥘 Ingredients</h3>
                <ul style="line-height:1.6;">
                    ${Post.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
                </ul>
            </div>
            
            <div class="instructions" style="margin-bottom:30px;">
                <h3 style="color:#E60023;border-bottom:2px solid #E60023;padding-bottom:5px;">👩‍🍳 Instructions</h3>
                <ol style="line-height:1.8;">
                    ${Post.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
                </ol>
            </div>
            
            <div class="pinterest-tags" style="background:#fff3f3;padding:15px;border-radius:8px;border-left:4px solid #E60023;">
                <p><strong>📌 Pinterest Tags:</strong> #${Post.tags.join(' #')}</p>
            </div>
            
            <div class="cta" style="text-align:center;margin-top:30px;padding:20px;background:#E60023;color:white;border-radius:8px;">
                <p><strong>📌 Save this Post to Pinterest!</strong></p>
                <p>Perfect for meal planning and sharing with friends</p>
            </div>
        </div>`;
        
        return html;
    }

    // Échapper les caractères XML
    escapeXML(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }



    // Méthode pour rafraîchir l'intégration RSS
    async refreshRSSIntegration() {
       console.log('Refreshing RSS integration...');
        await this.generateAndIntegrateRSS();
        
        // Notification de succès
        this.showRSSNotification('RSS integration refreshed successfully!');
    }

    // Méthode pour afficher une notification RSS
    showRSSNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `rss-notification rss-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : '⚠️'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animation d'apparition
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Suppression automatique après 3 secondes
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    // Ajouter les styles du RSS intégré
    addRSSStyles() {
        const existingStyle = document.getElementById('rss-integration-styles');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.id = 'rss-integration-styles';
        style.textContent = `
            .rss-integration-widget {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border: 1px solid #dee2e6;
                border-radius: 12px;
                overflow: hidden;
            }

            .rss-integrated-status {
                padding: 0;
            }

            .rss-status-header {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 10px 15px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 13px;
            }

            .status-icon {
                font-size: 12px;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            .rss-details {
                padding: 12px 15px;
                background: white;
            }

            .rss-details p {
                margin: 0 0 6px 0;
                font-size: 12px;
                color: #495057;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .rss-endpoints {
                background: #f8f9fa;
                padding: 10px 15px;
                border-top: 1px solid #e9ecef;
            }

            .endpoint-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 4px 0;
            }

            .endpoint-item code {
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                font-family: 'Courier New', monospace;
            }

            .endpoint-status {
                background: #28a745;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 600;
            }

            .rss-actions {
                padding: 12px 15px;
                display: flex;
                gap: 8px;
                background: white;
                border-top: 1px solid #e9ecef;
            }

            .rss-test-btn, .rss-refresh-btn {
                background: #007bff;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                transition: all 0.2s ease;
                flex: 1;
            }

            .rss-test-btn:hover {
                background: #0056b3;
                transform: translateY(-1px);
            }

            .rss-refresh-btn {
                background: #6c757d;
            }

            .rss-refresh-btn:hover {
                background: #545b62;
                transform: translateY(-1px);
            }

            .rss-info {
                padding: 8px 15px;
                background: #fff3cd;
                border-top: 1px solid #ffeaa7;
            }

            .rss-info small {
                display: block;
                font-size: 10px;
                color: #856404;
                margin: 2px 0;
                line-height: 1.3;
            }

            /* Notifications RSS */
            .rss-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                min-width: 300px;
            }

            .rss-notification.show {
                opacity: 1;
                transform: translateX(0);
            }

            .rss-notification-success {
                border-left: 4px solid #28a745;
            }

            .rss-notification-error {
                border-left: 4px solid #dc3545;
            }

            .notification-content {
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .notification-icon {
                font-size: 16px;
            }

            .notification-message {
                font-size: 13px;
                font-weight: 500;
                color: #333;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .rss-actions {
                    flex-direction: column;
                }
                
                .rss-notification {
                    left: 10px;
                    right: 10px;
                    min-width: auto;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    async loadRecentPosts(categoryId = null) {
        try {
           console.log('Loading recent Posts...', categoryId ? `filtered by category: ${categoryId}` : '');
            
            // Utiliser la même logique que PostLoader pour scanner les dossiers
            const PostFolders = await this.getPostFolders();
            
            if (PostFolders.length === 0) {
                this.setDefaultRecentPosts();
                return;
            }

            // Charger les données complètes des recettes
            const PostPromises = PostFolders.slice(0, 15).map(folder => 
                this.loadPostDataForSidebar(folder)
            );
            
            const Posts = await Promise.all(PostPromises);
            let validPosts = Posts.filter(Post => Post !== null);
            
            // Filtrer par catégorie si spécifié
            if (categoryId) {
                validPosts = this.filterPostsByCategory(validPosts, categoryId);
               console.log(`Filtered Posts by category ${categoryId}:`, validPosts.length);
            }
            
            if (validPosts.length === 0) {
                this.setDefaultRecentPosts();
                return;
            }

            // Trier par date de création/modification et prendre les 5 plus récentes
            validPosts.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.updatedAt || '2023-01-01');
                const dateB = new Date(b.createdAt || b.updatedAt || '2023-01-01');
                return dateB - dateA; // Plus récent en premier
            });

            this.recentPosts = validPosts.slice(0, 5).map(Post => ({
                slug: Post.slug || Post.folderName,
                title: Post.title,
                image: Post.mainImage,
                description: Post.description || 'Délicieuse recette à découvrir',
                created_date: Post.createdAt || Post.updatedAt,
                category_id: Post.category_id,
                category: Post.category,
                isOnline: Post.isOnline
            }));

           console.log('Recent Posts loaded:', this.recentPosts.length);
            
        } catch (error) {
           console.error('Error loading recent Posts:', error);
            await this.setDefaultRecentPosts();
        }
    }

    // Filtrer les recettes par catégorie ID
    filterPostsByCategory(Posts, categoryId) {
        return Posts.filter(Post => {
            if (!Post.category_id) return false;
            
            // Correspondance exacte de l'ID de catégorie
            if (Post.category_id === categoryId) {
                return true;
            }
            
            // Correspondance partielle si l'ID contient le terme recherché
            if (Post.category_id.includes(categoryId)) {
                return true;
            }
            
            return false;
        });
    }

    // Charger les recettes récentes d'une catégorie spécifique
    async loadRecentPostsByCategory(categoryId) {
        await this.loadRecentPosts(categoryId);
        return this.recentPosts;
    }

    // Obtenir les catégories disponibles
    async getAvailableCategories() {
        try {
            const PostFolders = await this.getPostFolders();
            const PostPromises = PostFolders.slice(0, 20).map(folder => 
                this.loadPostDataForSidebar(folder)
            );
            
            const Posts = await Promise.all(PostPromises);
            const validPosts = Posts.filter(Post => Post !== null);
            
            // Extraire toutes les catégories uniques
            const categories = new Map();
            
            validPosts.forEach(Post => {
                if (Post.category_id) {
                    categories.set(Post.category_id, {
                        id: Post.category_id,
                        name: Post.category || this.getCategoryName(Post.category_id),
                        count: (categories.get(Post.category_id)?.count || 0) + 1
                    });
                }
            });
            
            return Array.from(categories.values()).sort((a, b) => b.count - a.count);
            
        } catch (error) {
           console.error('Error loading categories:', error);
            return [];
        }
    }

    // Reprendre la logique de getPostFolders du PostLoader
    async getPostFolders() {
        try {
            const indexResponse = await fetch(`${this.postPath}index.json`);
            if (indexResponse.ok) {
                const indexData = await indexResponse.json();
                return indexData.folders || indexData;
            }
        } catch (error) {
           console.log('Fichier index.json non trouvé, scan automatique...');
        }

        return await this.scanPostFolders();
    }

    // Reprendre la logique de scanPostFolders du PostLoader
    async scanPostFolders() {
        const folders = [];
        
        const commonPostNames = [
            'cattle-ranch-casserole', 'cattle-ranch-casserole-2',
            'slow-cooker-cowboy-casserole', 'slow-cooker-cowboy-casserole-1',
            'red-lobster-shrimp-scampi', 'red-lobster-shrimp-scampi-1',
            'homemade-cheddar-biscuits', 'salisbury-steak-meatballs-with-mushroom-gravy',
            'apple-harvest-squares', 'chocolate-chip-cookies', 'pasta-carbonara',
            'chicken-tikka-masala', 'banana-bread', 'beef-stew', 'caesar-salad',
            'pancakes', 'pizza-margherita', 'tiramisu', 'lasagna', 'tacos',
            'burger', 'sandwich', 'curry', 'stir-fry', 'grilled-chicken',
            'chocolate-cake', 'apple-pie', 'french-toast', 'omelette',
            'beef-bourguignon', 'chicken-soup', 'vegetable-soup'
        ];

        for (const folderName of commonPostNames) {
            try {
                const response = await fetch(`${this.postPath}${folderName}/Post.json`, {
                    method: 'HEAD'
                });
                if (response.ok) {
                    folders.push(folderName);
                }
            } catch (error) {
                continue;
            }
        }

        return folders;
    }

    // Charger les données d'une recette pour la sidebar
    async loadPostDataForSidebar(folderName) {
        try {
            const jsonUrl = `${this.postPath}${folderName}/Post.json`;
            const jsonResponse = await fetch(jsonUrl);
            
            if (!jsonResponse.ok) {
                return null;
            }
            
            const PostData = await jsonResponse.json();
            
            if (!PostData.title) {
                return null;
            }
            
            return {
                slug: PostData.slug || folderName,
                folderName,
                title: PostData.title,
                description: PostData.description || 'Description non disponible',
                mainImage: this.getMainImage(PostData, folderName),
                createdAt: PostData.createdAt,
                updatedAt: PostData.updatedAt,
                isOnline: PostData.isOnline,
                ...PostData
            };
            
        } catch (error) {
           console.error(`Erreur lors du chargement de la recette ${folderName}:`, error);
            return null;
        }
    }

    // Méthode pour définir des recettes par défaut basées sur les dossiers existants
    async setDefaultRecentPosts() {
        try {
            // Essayer de charger quelques recettes réelles du dossier
            const availableFolders = [
                'cattle-ranch-casserole',
                'slow-cooker-cowboy-casserole', 
                'slow-cooker-cowboy-casserole-1',
                'red-lobster-shrimp-scampi-1',
                'homemade-cheddar-biscuits'
            ];

            const defaultPosts = [];

            for (const folder of availableFolders) {
                try {
                    const PostData = await this.loadPostDataForSidebar(folder);
                    if (PostData) {
                        defaultPosts.push({
                            slug: PostData.slug || folder,
                            title: PostData.title,
                            image: PostData.mainImage,
                            description: PostData.description || 'Délicieuse recette à découvrir',
                            category: PostData.category,
                            category_id: PostData.category_id,
                            isOnline: PostData.isOnline
                        });

                        if (defaultPosts.length >= 5) break;
                    }
                } catch (error) {
                   console.log(`Recette ${folder} non trouvée, passage à la suivante...`);
                    continue;
                }
            }

            // Si on a trouvé des recettes réelles, les utiliser
            if (defaultPosts.length > 0) {
                this.recentPosts = defaultPosts;
               console.log(`Utilisation de ${defaultPosts.length} recettes réelles comme fallback`);
                return;
            }

            // Sinon, utiliser des recettes par défaut basées sur les noms de dossiers existants
            this.recentPosts = [
                {
                    slug: 'cattle-ranch-casserole',
                    title: 'Cattle Ranch Casserole',
                    image: './posts/cattle-ranch-casserole/images/cattle-ranch-casserole_image_1.webp',
                    description: 'Délicieux plat familial au ranch'
                },
                {
                    slug: 'slow-cooker-cowboy-casserole-1', 
                    title: 'Slow Cooker Cowboy Casserole',
                    image: './posts/slow-cooker-cowboy-casserole-1/images/slow-cooker-cowboy-casserole-1_image_1.webp',
                    description: 'Casserole de cowboy à la mijoteuse'
                },
                {
                    slug: 'red-lobster-shrimp-scampi-1',
                    title: 'Red Lobster Shrimp Scampi',
                    image: './posts/red-lobster-shrimp-scampi-1/images/red-lobster-shrimp-scampi-1_image_1.webp',
                    description: 'Crevettes scampi style Red Lobster'
                },
                {
                    slug: 'homemade-cheddar-biscuits',
                    title: 'Homemade Cheddar Biscuits',
                    image: './posts/homemade-cheddar-biscuits/images/homemade-cheddar-biscuits_image_1.webp',
                    description: 'Biscuits au cheddar fait maison'
                },
                {
                    slug: 'salisbury-steak-meatballs-with-mushroom-gravy',
                    title: 'Salisbury Steak Meatballs',
                    image: './posts/salisbury-steak-meatballs-with-mushroom-gravy/images/salisbury-steak-meatballs-with-mushroom-gravy_image_1.webp',
                    description: 'Boulettes de viande sauce champignons'
                }
            ];

           console.log('Utilisation des recettes par défaut basées sur les dossiers existants');

        } catch (error) {
           console.error('Erreur lors du chargement des recettes par défaut:', error);
            
            // Dernier recours : recettes génériques
            this.recentPosts = [
                {
                    slug: 'Post-unavailable-1',
                    title: 'Recette Non Disponible',
                    image: 'https://via.placeholder.com/80x60?text=Post',
                    description: 'Recette temporairement indisponible'
                }
            ];
        }
    }

    // Nouvelle méthode pour générer le HTML des recettes récentes avec boutons Pinterest
    generateRecentPostsHTML() {
        if (!this.recentPosts || this.recentPosts.length === 0) {
            return `
                <div class="side-widget">
                    <h5>Other Posts</h5>
                    <div style="color: var(--muted, #666); font-size: 14px; padding: 10px;">
                        No recent Posts available
                    </div>
                </div>
            `;
        }
console.log(this.recentPosts);
        const PostsHTML = this.recentPosts.map(Post => `
            <div class="mini-Post" onclick="loadPost('${Post.slug}')" style="cursor: pointer; ${!Post.isOnline ? ' display:none;' : ''}">
                ${this.wrapImageWithPinterestButton(
                    `<img class="" src="${Post.image}" alt="${Post.title}">`,
                    Post.title,
                    Post.description,
                    Post.image
                )}            
                <div class="recent-Post-info">
                    <div class="Post-title">${Post.title}</div>
                    <div class="Post-title">${Post.description || 'Delicious Post'}</div>
                </div>
            </div>
        `).join('');

        return `
            <div class="side-widget">
                <h5>Recent Posts</h5>
                <div class="recent-Posts-list">
                    ${PostsHTML}
                </div>
            </div>
        `;
    }

    async loadActiveAuthor() {
        try {
           console.log('Loading authors from:', this.authorsPath);
            
            const response = await fetch(this.authorsPath);
            
            if (!response.ok) {
                console.warn(`Unable to load ${this.authorsPath}`);
                this.activeAuthor = { name: 'House Chef', bio: 'Specialist in traditional and family dishes.' };
                return;
            }
            
            const authorsData = await response.json();
            
            // Look for author with active: true
            const activeAuthor = authorsData.find(author => author.active === true);
            
            if (activeAuthor) {
                this.activeAuthor = activeAuthor;
               console.log('Active author found:', activeAuthor.name);
            } else {
                console.warn('No active author found, using default author');
                this.activeAuthor = { name: 'House Chef', bio: 'Specialist in traditional and family dishes.' };
            }
            
        } catch (error) {
           console.error('Error loading authors:', error);
            this.activeAuthor = { name: 'House Chef', bio: 'Specialist in traditional and family dishes.' };
        }
    }

    async waitForContainer() {
        const maxAttempts = 50;
        const baseDelay = 100;
        
        for (let i = 0; i < maxAttempts; i++) {
            this.contentContainer = document.getElementById('post-content');
            if (this.contentContainer) {
               console.log(`Container #post-content found after ${i + 1} attempt(s)`);
                return;
            }
            
            const delay = baseDelay * (i < 10 ? 1 : 2);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    getpostSlugFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const PostParam = urlParams.get('Post') || urlParams.get('slug');
        if (PostParam) return PostParam;
        
        const url = window.location.href;
        const match = url.match(/[?&]page=post-detail[&?]?([^&]*)/);
        if (match && match[1] && !match[1].includes('=')) {
            return match[1];
        }
        
        const pathMatch = url.match(/post-detail&([^&?]*)/);
        if (pathMatch && pathMatch[1]) {
            return pathMatch[1];
        }
        
        return null;
    }

    async loadPostData(postSlug) {
        try {
            const jsonUrl = `${this.postPath}${postSlug}/Post.json`;
           console.log('📡 Fetching Post from:', jsonUrl);
            
            const response = await fetch(jsonUrl);
           console.log('📡 Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                console.warn(`❌ HTTP ${response.status}: Unable to load ${jsonUrl}`);
                
                // Essayer des variations du nom de fichier
                const alternatives = [
                    `${this.postPath}${postSlug}.json`,
                    `${this.postPath}${postSlug}/data.json`,
                    `${this.postPath}${postSlug}/Post-data.json`
                ];
                
                for (const altUrl of alternatives) {
                   console.log('🔄 Trying alternative:', altUrl);
                    try {
                        const altResponse = await fetch(altUrl);
                        if (altResponse.ok) {
                           console.log('✅ Found alternative Post file:', altUrl);
                            const altData = await altResponse.json();
                            altData.folderName = postSlug;
                            altData.mainImage = this.getMainImage(altData, postSlug);
                            return altData;
                        }
                    } catch (altError) {
                       console.log('❌ Alternative failed:', altUrl, altError.message);
                    }
                }
                
                return null;
            }
            
            const PostData = await response.json();
           console.log('✅ Post data parsed successfully:', PostData.title || 'Untitled');
            
            // Validation des données essentielles
            if (!PostData.title) {
                console.warn('⚠️ Post missing title, adding default');
                PostData.title = postSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
            
            if (!PostData.description) {
                console.warn('⚠️ Post missing description, adding default');
                PostData.description = `Delicious ${PostData.title} Post`;
            }
            
            if (!PostData.ingredients || !Array.isArray(PostData.ingredients)) {
                console.warn('⚠️ Post missing ingredients, adding defaults');
                PostData.ingredients = ['Ingredients list not available'];
            }
            
            if (!PostData.instructions || !Array.isArray(PostData.instructions)) {
                console.warn('⚠️ Post missing instructions, adding defaults');
                PostData.instructions = ['Instructions not available'];
            }
            
            PostData.folderName = postSlug;
            PostData.mainImage = this.getMainImage(PostData, postSlug);
            
        //    console.log('🎯 Post processed:', {
        //         title: PostData.title,
        //         ingredients: PostData.ingredients?.length || 0,
        //         instructions: PostData.instructions?.length || 0,
        //         mainImage: PostData.mainImage
        //     });
            
            return PostData;
            
        } catch (error) {
           console.error(`💥 Error loading Post ${postSlug}:`, error);
            
            // Retourner une recette de fallback si possible
            if (error.name === 'SyntaxError') {
               console.error('❌ JSON parsing failed - invalid JSON format');
            } else if (error.name === 'TypeError') {
               console.error('❌ Network error - check file paths and server');
            }
            
            return this.createFallbackPost(postSlug);
        }
    }


    // Méthode pour ajouter les meta tags dynamiques pour chaque recette
addPostMetaTags(Post) {
    // Supprimer les anciens meta tags dynamiques
    document.querySelectorAll('meta[data-dynamic="true"]').forEach(meta => meta.remove());
    document.querySelectorAll('script[data-dynamic="true"]').forEach(script => script.remove());

    const currentUrl = window.location.href;
    const fullImageUrl = Post.mainImage.startsWith('http') ? 
        Post.mainImage : 
        `${window.location.origin}/${Post.mainImage.replace('./', '')}`;

    // Meta Tags de base
    const metaTags = [
        // Description
        { name: 'description', content: Post.description || `Delicious ${Post.title} Post` },
        
        // Open Graph
        { property: 'og:title', content: Post.title },
        { property: 'og:description', content: Post.description || `Delicious ${Post.title} Post` },
        { property: 'og:image', content: fullImageUrl },
        { property: 'og:url', content: currentUrl },
        { property: 'og:type', content: 'article' },
        
        // Twitter Card
        { name: 'twitter:title', content: Post.title },
        { name: 'twitter:description', content: Post.description || `Delicious ${Post.title} Post` },
        { name: 'twitter:image', content: fullImageUrl },
        
        // Pinterest
        { property: 'pinterest:description', content: Post.description || `Delicious ${Post.title} Post` },
        { name: 'pinterest', content: 'nopin', attr: Post.mainImage ? null : 'nopin' }
    ];

    // Ajouter les meta tags
    metaTags.forEach(tag => {
        const meta = document.createElement('meta');
        meta.setAttribute('data-dynamic', 'true');
        
        if (tag.property) {
            meta.setAttribute('property', tag.property);
        } else if (tag.name) {
            meta.setAttribute('name', tag.name);
        }
        
        if (tag.content) {
            meta.setAttribute('content', tag.content);
        }
        
        document.head.appendChild(meta);
    });

    // Mettre à jour le canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    canonical.href = currentUrl;

    // Ajouter Schema.org JSON-LD pour Post
    this.addPostschemaLD(Post, fullImageUrl, currentUrl);
    this.addBreadcrumbSchema(Post); 
}

// Méthode pour ajouter Schema.org Post
addPostschemaLD(Post, fullImageUrl, currentUrl) {
    // Supprimer l'ancien script s'il existe
    const existingScript = document.querySelector('script[type="application/ld+json"][data-Post="true"]');
    if (existingScript) {
        existingScript.remove();
    }

    const schemaData = {
        "@context": "https://schema.org",
        "@type": "Post",
        "name": Post.title,
        "image": [fullImageUrl],
        "author": {
            "@type": "Person",
            "name": this.activeAuthor?.name || "House Chef"
        },
        "datePublished": Post.createdAt || new Date().toISOString(),
        "description": Post.description || `Delicious ${Post.title} Post`,
        "prepTime": Post.prep_time ? `PT${Post.prep_time}M` : "PT15M",
        "cookTime": Post.cook_time ? `PT${Post.cook_time}M` : "PT30M",
        "totalTime": Post.total_time ? `PT${Post.total_time}M` : `PT${(Post.prep_time || 15) + (Post.cook_time || 30)}M`,
        "PostYield": Post.servings || "4 servings",
        "PostCategory": Post.category || "Main Dish",
        "PostCuisine": Post.cuisine || "American",
        "keywords": this.generateKeywords(Post),
        "PostIngredient": Post.ingredients || [],
        "PostInstructions": (Post.instructions || []).map((instruction, index) => ({
            "@type": "HowToStep",
            "name": `Step ${index + 1}`,
            "text": instruction,
            "position": index + 1
        })),
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": Post.rating || "4.5",
            "ratingCount": Post.ratingCount || "10"
        },
        "nutrition": {
            "@type": "NutritionInformation",
            "servingSize": Post.servings || "1 serving"
        },
        "url": currentUrl
    };

    // Ajouter video si disponible
    if (Post.video) {
        schemaData.video = {
            "@type": "VideoObject",
            "name": Post.title,
            "description": Post.description,
            "thumbnailUrl": fullImageUrl,
            "contentUrl": Post.video
        };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-Post', 'true');
    script.setAttribute('data-dynamic', 'true');
    script.textContent = JSON.stringify(schemaData, null, 2);
    document.head.appendChild(script);
}

// Méthode pour générer keywords
generateKeywords(Post) {
    const keywords = [];
    
    if (Post.category) keywords.push(Post.category);
    if (Post.difficulty) keywords.push(Post.difficulty);
    if (Post.type) keywords.push(Post.type);
    
    // Ajouter ingredients principaux
    if (Post.ingredients && Post.ingredients.length > 0) {
        Post.ingredients.slice(0, 3).forEach(ingredient => {
            const mainIngredient = ingredient.split(' ').find(word => word.length > 4);
            if (mainIngredient) keywords.push(mainIngredient.toLowerCase());
        });
    }
    
    keywords.push('Post', 'cooking', 'food');
    
    return keywords.join(', ');
}


addBreadcrumbSchema(Post) {
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": window.location.origin
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Posts",
                "item": `${window.location.origin}?page=posts`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": Post.category || "Category",
                "item": `${window.location.origin}?page=posts-category&category=${Post.category_id || ''}`
            },
            {
                "@type": "ListItem",
                "position": 4,
                "name": Post.title
            }
        ]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-breadcrumb', 'true');
    script.setAttribute('data-dynamic', 'true');
    script.textContent = JSON.stringify(breadcrumbSchema, null, 2);
    document.head.appendChild(script);
}

    // Créer une recette de fallback en cas d'erreur
    createFallbackPost(postSlug) {
       console.log('🆘 Creating fallback Post for:', postSlug);
        
        return {
            title: postSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: 'This Post is temporarily unavailable. Please try again later.',
            folderName: postSlug,
            mainImage: 'https://via.placeholder.com/400x300?text=Post+Unavailable',
            ingredients: [
                'Post ingredients are currently unavailable',
                'Please check back later for the complete Post'
            ],
            instructions: [
                'Post instructions are currently unavailable',
                'Please check back later for detailed cooking steps'
            ],
            prep_time: 0,
            cook_time: 0,
            total_time: 0,
            servings: 'Unknown',
            difficulty: 'unknown',
            category: 'Unavailable',
            structured_content: [{
                content: `
                    <div style="padding: 20px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #856404; margin-top: 0;">⚠️ Post Temporarily Unavailable</h3>
                        <p style="color: #856404; margin-bottom: 0;">
                            We're having trouble loading this Post. This might be due to:
                        </p>
                        <ul style="color: #856404;">
                            <li>The Post file is missing or moved</li>
                            <li>There's a temporary server issue</li>
                            <li>The Post is being updated</li>
                        </ul>
                        <p style="color: #856404; font-weight: bold;">
                            Please try refreshing the page or contact support if the problem persists.
                        </p>
                    </div>
                `
            }]
        };
    }

    getMainImage(PostData, folderName) {
        if (PostData.image_path) {
            return `./${PostData.image_path}`;
        }
        
        if (PostData.images && PostData.images.length > 0) {
            const mainImg = PostData.images.find(img => img.type === 'main');
            if (mainImg && mainImg.filePath) {
                return `./${mainImg.filePath}`;
            }
            
            if (PostData.images[0].filePath) {
                return `./${PostData.images[0].filePath}`;
            }
        }
        
        if (PostData.image) {
            return `./posts/${folderName}/images/${PostData.image}`;
        }
        
        return 'https://via.placeholder.com/400x300?text=Image+not+available';
    }

    // New method to render structured content with Pinterest buttons
    renderStructuredContent(structuredContent) {
        if (!structuredContent || !Array.isArray(structuredContent)) {
            return '';
        }

        let index = 0;
        return structuredContent.map((section) => {
            let html = '';
            
            

            // Main content
            if (section.content) {
                html += `<div class="content-section">${section.content}</div>`;
            }

            // Title/Headline
            if (section.headline) {
                html += `<h3 class="section-headline">${section.headline}</h3>`;
            }

            // Note with label
            if (section.note) {
                html += `
                    <div class="Post-note">
                        <div class="note-label">${section.note.label}</div>
                        <div class="note-content">${section.note.content}</div>
                    </div>
                `;
            }

            // Image upload with Pinterest button
            if (section.upload && section.upload.url && section.upload.url !== 'null') {
                const imageUrl = section.upload.url.startsWith('./posts/') ? 
                    section.upload.url : 
                    `./posts/${section.upload.url}`;
                index += 1;
                html += `
                    <div class="content-image Post-position-image-${index}">
                        ${this.wrapImageWithPinterestButton(
                            `<img class="" src="${imageUrl}" alt="${section.upload.context || 'Post image'}" 
                                 onerror="this.style.display='none'">`,
                            section.upload.context || 'Post Step',
                            'Step by step cooking guide',
                            imageUrl
                        )}
                        <div class="image-caption">${section.upload.context || ''}</div>
                    </div>
                `;
            }

            return html;
        }).join('');
    }

    // New method to create Post summary card
    createPostsummaryCard(Post) {
        const {
            title,
            description,
            prep_time,
            cook_time,
            total_time,
            servings,
            difficulty,
            type,
            ingredients = [],
            instructions = [],
            mainImage,
            tips
        } = Post;

        const prepTime = prep_time ? `${prep_time} minutes` : 'Not specified';
        const cookTime = cook_time ? `${cook_time} minutes` : 'Not specified';
        const totalTimeDisplay = total_time ? `${total_time} minutes` : 'Not specified';
        const difficultyDisplay = difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : 'Intermediate';
        const servingsDisplay = servings || '12 Servings';

        return `
            <div class="Post-summary-card">
                <div class="metadata-item-img-card">                                                
                    <img class="metadata-value" src="${mainImage}" alt="${title} Image" style="max-width: 145px; max-height: 145px; object-fit: cover; border-radius: 100%;">
                </div>
                <!-- Header with title and description -->

                <div class="Post-header">
                    <h1 class="Post-main-title">${title}</h1>
                    <p class="Post-description">${description || 'Delicious Post perfect for all occasions.'}</p>
                </div>
                <!-- Timing information -->
                <div class="timing-info">
                    <div class="timing-item">
                        <div class="timing-icon"></div>
                        <div class="timing-label">Preparation Time</div>
                        <div class="timing-value">${prepTime}</div>
                    </div>
                    <div class="timing-item">
                        <div class="timing-icon"></div>
                        <div class="timing-label">Cooking Duration</div>
                        <div class="timing-value">${cookTime}</div>
                    </div>
                    <div class="timing-item">
                        <div class="timing-icon"></div>
                        <div class="timing-label">Overall Time</div>
                        <div class="timing-value">${totalTimeDisplay}</div>
                    </div>
                </div>
                

                <!-- Post metadata -->
                <div class="Post-metadata">
                    <div class="metadata-item">
                        <span class="metadata-icon">♨</span>
                        <span class="metadata-label">Created By:</span>
                        <span class="metadata-value">${this.activeAuthor ? this.activeAuthor.name : 'House Chef'}</span>
                    </div>

                    <div class="metadata-item">
                        <span class="metadata-icon">♨</span>
                        <span class="metadata-label">Difficulty Level:</span>
                        <span class="metadata-value">${difficultyDisplay}</span>
                    </div>   
                    <div class="metadata-item">
                        <span class="metadata-icon">♨</span>
                        <span class="metadata-label">Serves:</span>
                        <span class="metadata-value">${servingsDisplay}</span>
                    </div>
                    <div class="metadata-item">                        
                        <span class="metadata-label"></span>
                        <span class="metadata-value">${Post.description || '-'}</span>
                    </div>
                </div>

                <!-- Ingredients section -->
                <div class="ingredients-section">
                    <h2 class="section-title">Ingredients You'll Need</h2>
                    <div class="ingredients-list">
                        ${ingredients.map((ingredient, index) => `
                            <div class="ingredient-item">
                                <div class="ingredient-number">${String(index + 1).padStart(2, '0')}</div>
                                <div class="ingredient-text">${ingredient}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Instructions section -->
                <div class="instructions-section">
                    <h2 class="section-title">Directions to Prepare</h2>
                    <div class="instructions-list">
                        ${instructions.map((instruction, index) => `
                            <div class="instruction-item">
                                <div class="step-badge">${String(index + 1).padStart(2, '0')}</div>
                                <div class="instruction-text">${instruction}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${tips ? `
                    <!-- Additional information section -->
                    <div class="additional-info-section">
                        <h2 class="section-title">Additional Information</h2>
                        <div class="info-content">
                            <div class="info-point">
                                <span class="bullet">•</span>
                                <span>${tips}</span>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Allergen information section -->
                <div class="allergen-section">
                    <h2 class="section-title">Allergen Information</h2>
                    <div class="allergen-content">
                        <div class="allergen-item">
                            <span class="bullet">•</span>
                            <span>Double-check every ingredient for allergens. Speak with a healthcare provider if unsure.</span>
                        </div>
                    </div>
                </div>

                <!-- Nutritional information section -->
                <div class="nutrition-section">
                    <h2 class="section-title">Nutritional Information (Per Serving)</h2>
                    <div class="nutrition-note">
                        <em>Please note that nutritional numbers are for general reference and shouldn't replace personalized dietary advice.</em>
                    </div>
                </div>
            </div>
        `;
    }

    displayPost(Post) {
        if (!this.contentContainer) {
           console.error('Container not available to display Post');
            return;
        }
        this.addPostMetaTags(Post);
        // Ajouter les styles Pinterest et RSS
        this.addPinterestStyles();
        this.addRSSStyles();

        const {
            title,
            description,
            prep_time,
            cook_time,
            total_time,
            servings,
            difficulty,
            createdAt,
            ingredients = [],
            instructions = [],
            tips,
            mainImage,
            images = [],
            structured_content = []
        } = Post;

        const prepTime = prep_time ? `⏱ ${prep_time} min` : '';
        const totalTimeDisplay = total_time ? `${total_time} min total` : '';
        const difficultyDisplay = difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : 'Not specified';

        // Render structured content
        const structuredContentHTML = this.renderStructuredContent(structured_content);
        
        // Create summary card
        const summaryCardHTML = this.createPostsummaryCard(Post);

        // Generate recent Posts HTML
        const recentPostsHTML = this.generateRecentPostsHTML();

        const createdAtFormatted = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
   

        const PostHTML = `
            <div class="social-links social-links-Post" bis_skin_checked="1">
                <a href="https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(globalThis.siteUrl + window.location.pathname)}&media=${encodeURIComponent(Post.mainImage)}&description=${encodeURIComponent(Post.title)}" target="_blank" id="pinterest-config" class="social-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M480 96L160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L232.6 544L230.4 543.2C225 495.1 227.3 485.7 246.1 408.5C250 392.5 254.6 373.5 260 350.6C260 350.6 252.7 335.8 252.7 314.1C252.7 243.4 328.2 236.1 328.2 289.1C328.2 302.6 322.8 320.2 317 338.9C313.7 349.5 310.4 360.4 307.9 370.9C302.2 395.4 320.2 415.3 344.3 415.3C388 415.3 421.5 369.3 421.5 302.9C421.5 244.1 379.2 203 318.9 203C249 203 208 255.4 208 309.6C208 330.7 216.2 353.3 226.3 365.6C228.3 368 228.6 370.1 228 372.6C226.9 377.3 224.9 385.5 223.3 391.8C222.3 395.8 221.5 399.1 221.2 400.4C220.1 404.9 217.7 405.9 213 403.7C182.4 389.4 163.2 344.6 163.2 308.6C163.2 231.1 219.4 160 325.4 160C410.6 160 476.8 220.7 476.8 301.8C476.8 386.4 423.5 454.5 349.4 454.5C324.5 454.5 301.1 441.6 293.1 426.3C293.1 426.3 280.8 473.2 277.8 484.7C272.8 504 260.2 527.6 250.4 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96z"></path></svg></a>
                <button id="print-Post" class="social-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M128 128C128 92.7 156.7 64 192 64L405.5 64C422.5 64 438.8 70.7 450.8 82.7L493.3 125.2C505.3 137.2 512 153.5 512 170.5L512 208L128 208L128 128zM64 320C64 284.7 92.7 256 128 256L512 256C547.3 256 576 284.7 576 320L576 416C576 433.7 561.7 448 544 448L512 448L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 448L96 448C78.3 448 64 433.7 64 416L64 320zM192 480L192 512L448 512L448 416L192 416L192 480zM520 336C520 322.7 509.3 312 496 312C482.7 312 472 322.7 472 336C472 349.3 482.7 360 496 360C509.3 360 520 349.3 520 336z"/></svg>
                Print the Post</button>
                <button id="jump-to-Post" class="social-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M192 512L192 334.4C197.2 335.4 202.5 336 208 336L224 336L224 512C224 520.8 216.8 528 208 528C199.2 528 192 520.8 192 512zM208 288C190.3 288 176 273.7 176 256L176 232C176 165.7 229.7 112 296 112L344 112C396.5 112 441.1 145.7 457.4 192.7C454.3 192.2 451.2 192 448 192C428 192 410.1 201.2 398.3 215.6C389.3 210.7 378.9 208 368 208C352.9 208 339 213.3 328 222C317 213.2 303.1 208 288 208L248 208C234.7 208 224 218.7 224 232C224 245.3 234.7 256 248 256L288 256C296.8 256 304 263.2 304 272C304 280.8 296.8 288 288 288L208 288zM128 256L128 256C128 274 134 290.6 144 304L144 512C144 547.3 172.7 576 208 576C243.3 576 272 547.3 272 512L272 430C277.1 431.3 282.5 432 288 432C313.3 432 335.2 417.3 345.6 396C352.6 398.6 360.1 400 368 400C388 400 405.9 390.8 417.7 376.4C426.7 381.3 437.1 384 448 384C483.3 384 512 355.3 512 320L512 232C512 139.2 436.8 64 344 64L296 64C203.2 64 128 139.2 128 232L128 256zM464 320C464 328.8 456.8 336 448 336C439.2 336 432 328.8 432 320L432 256C432 247.2 439.2 240 448 240C456.8 240 464 247.2 464 256L464 320zM288 336C293.5 336 298.9 335.3 304 334L304 368C304 376.8 296.8 384 288 384C279.2 384 272 376.8 272 368L272 336L288 336zM352 312L352 272C352 263.2 359.2 256 368 256C376.8 256 384 263.2 384 272L384 336C384 344.8 376.8 352 368 352C359.2 352 352 344.8 352 336L352 312z"/></svg>
                Jump to Post</button>
            
            </div>
            <div class="wrap">        
            
                <main class="main">

                    <div class="Post-card">
                        <div class="Post-author">           
                            <div>
                                <h5>By ${this.activeAuthor ? this.activeAuthor.name : 'House Chef'}</a>, ${createdAtFormatted}</h5>                        
                            </div>
                        </div>
                        <div class="meta-row">
                            <div style="flex:1">
                                <h1 class="title">${title}</h1>
                                <div class="meta-small">${description}</div>
                            </div>
   
                        </div>

                        <div class="hero">
                            ${this.wrapImageWithPinterestButton(
                                `<img src="${mainImage}" alt="${title}"">`,
                                title,
                                description || 'Delicious Post perfect for all occasions',
                                mainImage
                            )}
                        </div>

                        <div class="badge-row">
                            <div class="badge">Post</div>
                            <div class="badge">${difficultyDisplay}</div>
                            ${servings ? `<div class="badge">${servings} servings</div>` : ''}
                        </div>

                        <!-- Complete structured content -->
                        <div class="structured-content">
                            ${structuredContentHTML}
                        </div>

                        <!-- Fallback if no structured content -->
                        ${!structured_content.length ? `
                            <section class="Post-section">
                                <h4>Ingredients</h4>
                                <ul>
                                    ${ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
                                </ul>
                            </section>

                            <section class="Post-section">
                                <h4>Instructions</h4>
                                <ol>
                                    ${instructions.map((step, index) => `<li><strong>Step ${index + 1}:</strong> ${step}</li>`).join('')}
                                </ol>
                            </section>

                            ${tips ? `
                                <section class="Post-section">
                                    <h4>Tips</h4>
                                    <div>${tips}</div>
                                </section>
                            ` : ''}
                        ` : ''}
                        
                        <!-- Summary card at end of article -->
                        ${summaryCardHTML}
                    </div>
                </main>

                <aside class="sidebar">
                    <div class="author-card">
                        <div style="height:54px"></div>
                        <img src="${this.activeAuthor ? this.activeAuthor.imagePath : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop&crop=faces'}" alt="Chef">
                        <div class="name">${this.activeAuthor ? this.activeAuthor.name : 'House Chef'}</div>
                        <div class="bio">${this.activeAuthor ? this.activeAuthor.bio || 'Specialist in traditional and family dishes.' : 'Specialist in traditional and family dishes.'}</div>
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                        </div>
                    </div>

                    <div class="side-widget">
                        <h5>Nutritional Information</h5>
                        <div style="color:var(--muted);font-size:14px">
                            Estimates based on standard ingredients
                        </div>
                    </div>

                    ${recentPostsHTML}
                </aside>
            </div>

         
        `;

        this.contentContainer.innerHTML = PostHTML;
        
        // Add event listeners for buttons
        this.addCardEventListeners(Post);
        
        document.title = `${title} - Detailed Post`;
    }

    // New method to add event listeners
    addCardEventListeners(Post) {
        // Ajouter des event listeners pour empêcher la propagation du clic sur les boutons Pinterest
        const pinterestButtons = this.contentContainer.querySelectorAll('.pinterest-pin-btn');
        pinterestButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                // Le onclick dans le HTML s'occupera d'ouvrir Pinterest
            });
        });

       console.log('Post card displayed for:', Post.title);
    }

}

// Fonction globale pour charger une recette
function loadPost(postSlug) {
    // Modifier l'URL pour charger la nouvelle recette
    const newUrl = `${window.location.origin}${window.location.pathname}?page=post-detail&Post=${postSlug}`;
    window.history.pushState({}, '', newUrl);
    window.location=newUrl;
    
    // // Réinitialiser et charger la nouvelle recette
    // if (window.PostDetailLoader) {
    //     window.PostDetailLoader.initialized = false;
    //     window.PostDetailLoader.init();
    // } else {
    //     initPostDetail();
    // }
}

// Global variables
let postDetailLoaderInstance;
let initAttempts = 0;
const maxInitAttempts = 20;

function initPostDetail() {
    initAttempts++;
    
   console.log(`🔄 InitPostDetail attempt ${initAttempts}/${maxInitAttempts}`);
    
    if (PostDetailLoader && PostDetailLoader.initialized) {
       console.log('✅ PostDetailLoader already initialized');
        return;
    }

    const container = document.getElementById('post-content');
    
    if (container) {
       console.log('✅ Container found, initializing PostDetailLoader...');
        PostDetailLoader = new PostDetailLoader();
        window.PostDetailLoader = PostDetailLoader; // Rendre accessible globalement
        
        // Ajouter des informations de debug
    //    console.log('🔧 Debug info:', {
    //         containerFound: !!container,
    //         currentURL: window.location.href,
    //         PostPath: PostDetailLoader.postPath,
    //         attempt: initAttempts
    //     });
        
        PostDetailLoader.init().catch(error => {
           console.error('💥 Initialization failed:', error);            
        });
        
    } else if (initAttempts < maxInitAttempts) {
       console.log(`⏳ Container not found, retrying... (${initAttempts}/${maxInitAttempts})`);
        setTimeout(initPostDetail, 200);
    } else {
       console.error('❌ Container not found after', maxInitAttempts, 'attempts');
       console.error('🔍 Available containers:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        
        // Essayer de créer le container si le body existe
        if (document.body) {
           console.log('🆘 Creating fallback container...');
            const fallbackContainer = document.createElement('div');
            fallbackContainer.id = 'post-content';
           
            
            // Retry with the new container
            setTimeout(() => {
                initAttempts = 0;
                initPostDetail();
            }, 500);
        }
    }
}

// Initialization points
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPostDetail);
} else {
    setTimeout(initPostDetail, 100);
}

window.addEventListener('load', () => {
    if (!PostDetailLoader) {
        setTimeout(initPostDetail, 200);
    }
});

// Observer for SPA
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const container = document.getElementById('post-content');
                if (container && !PostDetailLoader) {
                    initPostDetail();
                }
            }
        });
    });

    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

window.forceInitPostDetail = function() {
   console.log('Force initialization...');
    PostDetailLoader = null;
    initAttempts = 0;
    initPostDetail();
};


// Fonction pour imprimer la recette
function printPost() {
    
    const PostCard = document.querySelector('.Post-summary-card');
    
    if (!PostCard) {
        console.error('Post card not found');
        alert('Post card not found');
        return;
    }
    
    // Créer le HTML pour l'impression
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Post</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .Post-main-title {
                    font-size: 28px;
                    margin-bottom: 10px;
                }
                .Post-description {
                    font-size: 16px;
                    color: #666;
                    margin-bottom: 20px;
                }
                .timing-info, .Post-metadata {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 15px;
                    margin: 20px 0;
                    padding: 15px;
                    background: #f5f5f5;
                    border-radius: 8px;
                }
                .section-title {
                    font-size: 22px;
                    margin: 30px 0 15px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 5px;
                }
                .ingredient-item, .instruction-item {
                    margin: 10px 0;
                    padding: 10px;
                }
                .social-links {
                    display: none !important;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            ${PostCard.innerHTML}
        </body>
        </html>
    `;
    
    // Créer une iframe cachée pour l'impression
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(printContent);
    doc.close();
    
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    // Nettoyer après impression
    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 1000);
}

// Fonction pour scroller vers la recette
function jumpToPost() {
    
    const PostCard = document.querySelector('.Post-summary-card');
    
    if (!PostCard) {
        console.error('Post card not found');
        alert('Post card not found');
        return;
    }
    
    // Scroll vers la carte recette
    PostCard.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
    });
    
    // Effet visuel
    PostCard.style.transition = 'box-shadow 0.3s, transform 0.3s';
    PostCard.style.boxShadow = '0 0 20px rgba(255, 193, 7, 0.5)';
    PostCard.style.transform = 'scale(1.01)';
    
    setTimeout(() => {
        PostCard.style.boxShadow = '';
        PostCard.style.transform = '';
    }, 1000);
}

// Méthode 1: Attacher immédiatement si les boutons existent déjà
const attachEventListeners = () => {
    const printButton = document.getElementById('print-Post');
    const jumpButton = document.getElementById('jump-to-Post');
    
    if (printButton) {
        // Supprimer les anciens listeners pour éviter les doublons
        printButton.removeEventListener('click', printPost);
        printButton.addEventListener('click', printPost);
    
    }
    
    if (jumpButton) {
        jumpButton.removeEventListener('click', jumpToPost);
        jumpButton.addEventListener('click', jumpToPost);
    }
};

// Méthode 2: Utiliser la délégation d'événements sur le document
document.addEventListener('click', function(e) {
    if (e.target.id === 'print-Post' || e.target.closest('#print-Post')) {
        e.preventDefault();
        printPost();
    }
    
    if (e.target.id === 'jump-to-Post' || e.target.closest('#jump-to-Post')) {
        e.preventDefault();
        jumpToPost();
    }
});

// Attacher au chargement du DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachEventListeners);
} else {
    attachEventListeners();
}

// Si le contenu est chargé dynamiquement, attacher après un délai
setTimeout(attachEventListeners, 500);
setTimeout(attachEventListeners, 1000);