class PostDetailLoader {
    constructor() {
        this.contentContainer = null;
        this.postsPath = './posts/';
        this.authorsPath = './authors/authors.json';
        this.initialized = false;
        this.activeAuthor = null;
        this.recentPosts = [];
        this.rssConfig = {
            title: 'Posts Feed',
            description: 'Fresh posts and inspiration for Pinterest',
            link: window.location.origin,
            language: 'en-US',
            copyright: `© ${new Date().getFullYear()} Post Collection`,
            managingEditor: 'posts@example.com (Post Team)',
            webMaster: 'webmaster@example.com (Web Master)',
            category: 'Kids Education',
            generator: 'PostDetailLoader RSS Generator',
            docs: 'https://www.rssboard.org/rss-specification',
            ttl: 1440,
            maxItems: 50
        };
    }

    async init() {
        if (this.initialized) return;

        try {
            await this.waitForContainer();
            
            if (!this.contentContainer) {
                // console.error('Container #Post-content not found');
                return;
            }

            await this.loadActiveAuthor();

            const postSlug = this.getPostSlugFromUrl();
            
            // if (!postSlug) {
            //     this.showError('Post name missing from URL');
            //     return;
            // }
            
            const post = await this.loadPostData(postSlug);
            
            if (!post) {
                this.showError(`Post "${postSlug}" not found`);
                return;
            }

            await this.loadRecentPosts(post.category_id);

            this.displayPost(post);
            this.initialized = true;

        } catch (error) {
            // console.error('Error loading Post:', error);
            this.showError('Error loading Post');
        }
    }

    // ✅ CORRECTION: Méthode waitForContainer qui crée le conteneur s'il n'existe pas
    async waitForContainer() {
        const maxAttempts = 50;
        const baseDelay = 100;
        
        for (let i = 0; i < maxAttempts; i++) {
            this.contentContainer = document.getElementById('post-content');
            if (this.contentContainer) {
               // // console.log(`Container #post-content found after ${i + 1} attempt(s)`);
                return;
            }
            
            const delay = baseDelay * (i < 10 ? 1 : 2);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

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
                opacity: 1;
                transform: translateY(0);
            }

            .image-container:hover img {
                transform: scale(1.02);
            }

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

            .content-image {
                position: relative;
                margin: 20px 0;
            }

            .content-image .image-container {
                width: 100%;
            }

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

    wrapImageWithPinterestButton(imageHtml, title, description = '', imageUrl = '') {
        if (!imageUrl) {
            const imgMatch = imageHtml.match(/src=["']([^"']+)["']/);
            imageUrl = imgMatch ? imgMatch[1] : '';
        }

        const imgContent = imageHtml.match(/<img[^>]*>/i)?.[0] || imageHtml;
        
        return `
            <div class="image-container">
                ${imgContent}
                ${this.createPinterestButton(imageUrl, title, description)}
            </div>
        `;
    }

    // ✅ CORRECTION: loadRecentPosts avec post en minuscule
    async loadRecentPosts(categoryId = null) {
        try {
            // console.log('Loading recent posts...', categoryId ? `filtered by category: ${categoryId}` : '');
            
            const postFolders = await this.getPostFolders();
            
            if (postFolders.length === 0) {
                await this.setDefaultRecentPosts();
                return;
            }

            const postPromises = postFolders.slice(0, 15).map(folder =>
                this.loadPostDataForSidebar(folder)
            );
            
            const posts = await Promise.all(postPromises);
            let validPosts = posts.filter(post => post !== null);
            
            if (categoryId) {
                validPosts = this.filterPostsByCategory(validPosts, categoryId);
                // console.log(`Filtered posts by category ${categoryId}:`, validPosts.length);
            }
            
            if (validPosts.length === 0) {
                await this.setDefaultRecentPosts();
                return;
            }

            validPosts.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.updatedAt || '2023-01-01');
                const dateB = new Date(b.createdAt || b.updatedAt || '2023-01-01');
                return dateB - dateA;
            });

            // ✅ CORRIGÉ: post en minuscule (pas Post en majuscule)
            this.recentPosts = validPosts.slice(0, 5).map(post => ({
                slug: post.slug || post.folderName,
                title: post.title,
                image: post.mainImage,
                description: post.description || 'Délicieuse poste à découvrir',
                created_date: post.createdAt || post.updatedAt,
                category_id: post.category_id,
                category: post.category,
                isOnline: post.isOnline
            }));

            // console.log('Recent posts loaded:', this.recentPosts.length);
            
        } catch (error) {
            // console.error('Error loading recent posts:', error);
            await this.setDefaultRecentPosts();
        }
    }

    filterPostsByCategory(posts, categoryId) {
        return posts.filter(post => {
            if (!post.category_id) return false;
            
            if (post.category_id === categoryId) {
                return true;
            }
            
            if (post.category_id.includes(categoryId)) {
                return true;
            }
            
            return false;
        });
    }

    async getPostFolders() {
        try {
            const indexResponse = await fetch(`${this.postsPath}index.json`);
            if (indexResponse.ok) {
                const indexData = await indexResponse.json();
                return indexData.folders || indexData;
            }
        } catch (error) {
            // console.log('Fichier index.json non trouvé, scan automatique...');
        }

        return await this.scanPostFolders();
    }

    async scanPostFolders() {
        const folders = [];
        const commonPostNames = [];

        for (const folderName of commonPostNames) {
            try {
                const response = await fetch(`${this.postsPath}${folderName}/Post.json`, {
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

    async loadPostDataForSidebar(folderName) {
        try {
            const jsonUrl = `${this.postsPath}${folderName}/Post.json`;
            const jsonResponse = await fetch(jsonUrl);
            
            if (!jsonResponse.ok) {
                return null;
            }
            
            const postData = await jsonResponse.json();
            
            if (!postData.title) {
                return null;
            }
            
            return {
                slug: postData.slug || folderName,
                folderName,
                title: postData.title,
                description: postData.description || 'Description non disponible',
                mainImage: this.getMainImage(postData, folderName),
                createdAt: postData.createdAt,
                updatedAt: postData.updatedAt,
                isOnline: postData.isOnline,
                ...postData
            };
            
        } catch (error) {
            // console.error(`Erreur lors du chargement de la poste ${folderName}:`, error);
            return null;
        }
    }

    async setDefaultRecentPosts() {
        try {
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
                    const postData = await this.loadPostDataForSidebar(folder);
                    if (postData) {
                        defaultPosts.push({
                            slug: postData.slug || folder,
                            title: postData.title,
                            image: postData.mainImage,
                            description: postData.description || 'Délicieuse poste à découvrir',
                            category: postData.category,
                            category_id: postData.category_id,
                            isOnline: postData.isOnline
                        });

                        if (defaultPosts.length >= 5) break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (defaultPosts.length > 0) {
                this.recentPosts = defaultPosts;
                return;
            }

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

        } catch (error) {
            // console.error('Erreur lors du chargement des postes par défaut:', error);
            
            this.recentPosts = [
                {
                    slug: 'Post-unavailable-1',
                    title: 'poste Non Disponible',
                    image: 'https://via.placeholder.com/80x60?text=Post',
                    description: 'poste temporairement indisponible'
                }
            ];
        }
    }

    generateRecentPostsHTML() {
        if (!this.recentPosts || this.recentPosts.length === 0) {
            return `
                <div class="side-widget">
                    <h5>Other posts</h5>
                    <div style="color: var(--muted, #666); font-size: 14px; padding: 10px;">
                        No recent posts available
                    </div>
                </div>
            `;
        }

        // console.log(this.recentPosts);
        
        const postsHTML = this.recentPosts.map(post => `
            <div class="mini-Post" onclick="loadPost('${post.slug}')" style="cursor: pointer; ${!post.isOnline ? 'display:none;' : ''}">
                ${this.wrapImageWithPinterestButton(
                    `<img class="" src="${post.image}" alt="${post.title}">`,
                    post.title,
                    post.description,
                    post.image
                )}            
                <div class="recent-Post-info">
                    <div class="Post-title">${post.title}</div>
                    <div class="Post-description">${post.description || 'Post'}</div>
                </div>
            </div>
        `).join('');

        return `
            <div class="side-widget">
                <h5>Recent Posts</h5>
                <div class="recent-posts-list">
                    ${postsHTML}
                </div>
            </div>
        `;
    }

    async loadActiveAuthor() {
        try {
            const response = await fetch(this.authorsPath);
            
            if (!response.ok) {
                // console.warn(`Unable to load ${this.authorsPath}`);
                // this.activeAuthor = { name: 'House Chef', bio: 'Specialist in traditional and family dishes.' };
                return;
            }
            
            const authorsData = await response.json();
            const activeAuthor = authorsData.find(author => author.active === true);
            
            if (activeAuthor) {
                this.activeAuthor = activeAuthor;
            } else {
                // console.warn('No active author found, using default author');
                this.activeAuthor = { name: 'House Chef', bio: '' };
            }
            
        } catch (error) {
            // console.error('Error loading authors:', error);
            // this.activeAuthor = { name: 'House Chef', bio: 'Specialist in traditional and family dishes.' };
        }
    }

    getPostSlugFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const postParam = urlParams.get('Post') || urlParams.get('slug');
        if (postParam) return postParam;
        
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
            const jsonUrl = `${this.postsPath}${postSlug}/Post.json`;
              console.log('📡 Fetching recipe from:', jsonUrl);
            
            const response = await fetch(jsonUrl);
            console.log('📡 Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                // console.warn(`❌ HTTP ${response.status}: Unable to load ${jsonUrl}`);
                
                // Essayer des variations du nom de fichier
                const alternatives = [
                    `${this.postsPath}${postSlug}.json`,
                    `${this.postsPath}${postSlug}/data.json`,
                    `${this.postsPath}${postSlug}/post-data.json`
                ];
                
                for (const altUrl of alternatives) {
                   // // console.log('🔄 Trying alternative:', altUrl);
                    try {
                        const altResponse = await fetch(altUrl);
                        if (altResponse.ok) {
                           // // console.log('✅ Found alternative recipe file:', altUrl);
                            const altData = await altResponse.json();
                            altData.folderName = postSlug;
                            altData.mainImage = this.getMainImage(altData, postSlug);
                            return altData;
                        }
                    } catch (altError) {
                       // // console.log('❌ Alternative failed:', altUrl, altError.message);
                    }
                }
                
                return null;
            }

            const postData = await response.json();
             console.log('✅ Post data parsed successfully:', postData.title || 'Untitled');
            
            // Validation des données essentielles
            if (!postData.title) {
                console.warn('⚠️ Post missing title, adding default');
                postData.title = postSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }

            if (!postData.description) {
                console.warn('⚠️ Post missing description, adding default');
                postData.description = `Delicious ${postData.title} post`;
            }
            
            if (!postData.ingredients || !Array.isArray(postData.ingredients)) {
                console.warn('⚠️ Post missing ingredients, adding defaults');
                recipeData.ingredients = ['Ingredients list not available'];
            }

            if (!postData.instructions || !Array.isArray(postData.instructions)) {
                console.warn('⚠️ Post missing instructions, adding defaults');
                postData.instructions = ['Instructions not available'];
            }

            postData.folderName = postSlug;
            console.log('📋 Post data loaded:');
            postData.mainImage = this.getMainImage(postData, postSlug);
            
            console.log('🎯 Recipe processed:', {
                title: postData.title,
                ingredients: postData.ingredients?.length || 0,
                instructions: postData.instructions?.length || 0,
                mainImage: postData.mainImage
            });
            
            return postData;
            
        } catch (error) {
           // console.error(`💥 Error loading recipe ${recipeSlug}:`, error);
            
            // Retourner une recette de fallback si possible
            if (error.name === 'SyntaxError') {
               // console.error('❌ JSON parsing failed - invalid JSON format');
            } else if (error.name === 'TypeError') {
               // console.error('❌ Network error - check file paths and server');
            }

            return this.createFallbackPost(postSlug);
        }
    }

    createFallbackPost(postSlug) {
        return {
            title: postSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: 'This Post is temporarily unavailable. Please try again later.',
            folderName: postSlug,
            mainImage: 'https://via.placeholder.com/400x300?text=Post+Unavailable',
            ingredients: ['Post ingredients are currently unavailable'],
            instructions: ['Post instructions are currently unavailable'],
            prep_time: 0,
            cook_time: 0,
            total_time: 0,
            servings: 'Unknown',
            difficulty: 'unknown',
            category: 'Unavailable',
            structured_content: []
        };
    }

    getMainImage(postData, folderName) {
        if (postData.image_path) {
            return `./${postData.image_path}`;
        }
        
        if (postData.images && postData.images.length > 0) {
            const mainImg = postData.images.find(img => img.type === 'main');
            if (mainImg && mainImg.filePath) {
                return `./${mainImg.filePath}`;
            }
            
            if (postData.images[0].filePath) {
                return `./${postData.images[0].filePath}`;
            }
        }
        
        if (postData.image) {
            return `./posts/${folderName}/images/${postData.image}`;
        }
        
        return 'https://via.placeholder.com/400x300?text=Image+not+available';
    }

    renderStructuredContent(structuredContent) {
        if (!structuredContent || !Array.isArray(structuredContent)) {
            return '';
        }

        let index = 0;
        return structuredContent.map((section) => {
            let html = '';

            if (section.content) {
                html += `<div class="content-section">${section.content}</div>`;
            }

            if (section.headline) {
                html += `<h3 class="section-headline">${section.headline}</h3>`;
            }

            if (section.note) {
                html += `
                    <div class="Post-note">
                        <div class="note-label">${section.note.label}</div>
                        <div class="note-content">${section.note.content}</div>
                    </div>
                `;
            }

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

    createPostSummaryCard(post) {
        const {
            title,
            description,
            prep_time,
            cook_time,
            total_time,
            servings,
            difficulty,
            ingredients = [],
            instructions = [],
            mainImage,
            images = [],
            tips
        } = post;

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

                <div class="Post-header">
                    <h1 class="Post-main-title">${title}</h1>
                    <p class="Post-description">${description || 'Delicious Post perfect for all occasions.'}</p>
                </div>

                <div class="timing-info">
                    <div class="timing-item">
                        <div class="timing-icon"></div>
                        <div class="timing-label">Preparation Time</div>
                        <div class="timing-value">${prepTime}</div>
                    </div>
                    <div class="timing-item">
                        <div class="timing-icon"></div>
                        <div class="timing-label">Duration</div>
                        <div class="timing-value">${cookTime}</div>
                    </div>
                    <div class="timing-item">
                        <div class="timing-icon"></div>
                        <div class="timing-label">Overall Time</div>
                        <div class="timing-value">${totalTimeDisplay}</div>
                    </div>
                </div>

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
                </div>



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
                <div class="download-images-section">
                    <h2 class="section-title">Download Images</h2>
                <br>
                <img src="${mainImage}" alt="Main Image" style="max-width: 200px; border-radius: 8px;">
                <br><a class"download image1" href="${mainImage}" download="image1">Download Image</a>
                <br>
                <img src="${images[0]["filePath"]}" alt="Image 2" style="max-width: 200px; border-radius: 8px;">
                <br><a class"download image2" href="${images[1]["filePath"]}" download="image2">Download Image</a>
                <br>
                <img src="${images[2]["filePath"]}" alt="Image 3" style="max-width: 200px; border-radius: 8px;">
                <br><a class"download image3" href="${images[2]["filePath"]}" download="image3">Download Image</a>
                
                </div>
            </div>
        `;
    }

    displayPost(post) {
        if (!this.contentContainer) {
            // console.error('Container not available to display Post');
            return;
        }

        this.addPinterestStyles();

        const {
            title,
            description,
            prep_time,
            cook_time,
            total_time,
            servings,
            difficulty,
            ingredients = [],
            instructions = [],
            tips,
            mainImage,
            structured_content = []
        } = post;

        const prepTime = prep_time ? `⏱ ${prep_time} min` : '';
        const totalTimeDisplay = total_time ? `${total_time} min total` : '';
        const difficultyDisplay = difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : 'Not specified';

        const structuredContentHTML = this.renderStructuredContent(structured_content);
        const summaryCardHTML = this.createPostSummaryCard(post);
        const recentPostsHTML = this.generateRecentPostsHTML();

        const postHTML = `
            <div class="social-links social-links-Post">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                        <path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L258.2 544L258.2 398.2L205.4 398.2L205.4 320L258.2 320L258.2 286.3C258.2 199.2 297.6 158.8 383.2 158.8C399.4 158.8 427.4 162 438.9 165.2L438.9 236C432.9 235.4 422.4 235 409.3 235C367.3 235 351.1 250.9 351.1 292.2L351.1 320L434.7 320L420.3 398.2L351 398.2L351 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96L160 96z"></path>
                    </svg>
                </a>
                <a href="https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&media=${encodeURIComponent(post.mainImage)}&description=${encodeURIComponent(post.title)}" target="_blank" class="social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                        <path d="M480 96L160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L232.6 544L230.4 543.2C225 495.1 227.3 485.7 246.1 408.5C250 392.5 254.6 373.5 260 350.6C260 350.6 252.7 335.8 252.7 314.1C252.7 243.4 328.2 236.1 328.2 289.1C328.2 302.6 322.8 320.2 317 338.9C313.7 349.5 310.4 360.4 307.9 370.9C302.2 395.4 320.2 415.3 344.3 415.3C388 415.3 421.5 369.3 421.5 302.9C421.5 244.1 379.2 203 318.9 203C249 203 208 255.4 208 309.6C208 330.7 216.2 353.3 226.3 365.6C228.3 368 228.6 370.1 228 372.6C226.9 377.3 224.9 385.5 223.3 391.8C222.3 395.8 221.5 399.1 221.2 400.4C220.1 404.9 217.7 405.9 213 403.7C182.4 389.4 163.2 344.6 163.2 308.6C163.2 231.1 219.4 160 325.4 160C410.6 160 476.8 220.7 476.8 301.8C476.8 386.4 423.5 454.5 349.4 454.5C324.5 454.5 301.1 441.6 293.1 426.3C293.1 426.3 280.8 473.2 277.8 484.7C272.8 504 260.2 527.6 250.4 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96z"></path>
                    </svg>
                </a>
                <button id="print-Post" class="social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                        <path d="M128 128C128 92.7 156.7 64 192 64L405.5 64C422.5 64 438.8 70.7 450.8 82.7L493.3 125.2C505.3 137.2 512 153.5 512 170.5L512 208L128 208L128 128zM64 320C64 284.7 92.7 256 128 256L512 256C547.3 256 576 284.7 576 320L576 416C576 433.7 561.7 448 544 448L512 448L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 448L96 448C78.3 448 64 433.7 64 416L64 320zM192 480L192 512L448 512L448 416L192 416L192 480zM520 336C520 322.7 509.3 312 496 312C482.7 312 472 322.7 472 336C472 349.3 482.7 360 496 360C509.3 360 520 349.3 520 336z"/>
                    </svg>
                    Print
                </button>
                <button id="jump-to-Post" class="social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                        <path d="M192 512L192 334.4C197.2 335.4 202.5 336 208 336L224 336L224 512C224 520.8 216.8 528 208 528C199.2 528 192 520.8 192 512zM208 288C190.3 288 176 273.7 176 256L176 232C176 165.7 229.7 112 296 112L344 112C396.5 112 441.1 145.7 457.4 192.7C454.3 192.2 451.2 192 448 192C428 192 410.1 201.2 398.3 215.6C389.3 210.7 378.9 208 368 208C352.9 208 339 213.3 328 222C317 213.2 303.1 208 288 208L248 208C234.7 208 224 218.7 224 232C224 245.3 234.7 256 248 256L288 256C296.8 256 304 263.2 304 272C304 280.8 296.8 288 288 288L208 288zM128 256L128 256C128 274 134 290.6 144 304L144 512C144 547.3 172.7 576 208 576C243.3 576 272 547.3 272 512L272 430C277.1 431.3 282.5 432 288 432C313.3 432 335.2 417.3 345.6 396C352.6 398.6 360.1 400 368 400C388 400 405.9 390.8 417.7 376.4C426.7 381.3 437.1 384 448 384C483.3 384 512 355.3 512 320L512 232C512 139.2 436.8 64 344 64L296 64C203.2 64 128 139.2 128 232L128 256zM464 320C464 328.8 456.8 336 448 336C439.2 336 432 328.8 432 320L432 256C432 247.2 439.2 240 448 240C456.8 240 464 247.2 464 256L464 320zM288 336C293.5 336 298.9 335.3 304 334L304 368C304 376.8 296.8 384 288 384C279.2 384 272 376.8 272 368L272 336L288 336zM352 312L352 272C352 263.2 359.2 256 368 256C376.8 256 384 263.2 384 272L384 336C384 344.8 376.8 352 368 352C359.2 352 352 344.8 352 336L352 312z"/>
                    </svg>
                    Jump to print
                </button>
            </div>
            
            <div class="wrap">
                <main class="main">
                    <div class="Post-card">
                        <div class="meta-row">
                            <div style="flex:1">
                                <h1 class="title">${title}</h1>
                                <div class="meta-small">${description}</div>
                            </div>
                        </div>

                        <div class="hero">
                            ${this.wrapImageWithPinterestButton(
                                `<img src="${mainImage}" alt="${title}">`,
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

                        <div class="structured-content">
                            ${structuredContentHTML}
                        </div>

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
                        
                        ${summaryCardHTML}
                    </div>
                </main>

                <aside class="sidebar">
                    <div class="author-card">
                        <div style="height:54px"></div>
                        <img src="${this.activeAuthor ? this.activeAuthor.imagePath : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop&crop=faces'}" alt="Chef">
                        <div class="name">${this.activeAuthor ? this.activeAuthor.name : 'House Chef'}</div>
                        <div class="bio">${this.activeAuthor ? this.activeAuthor.description : ''}</div>
                    </div>



                    ${recentPostsHTML}
                </aside>
            </div>
        `;

        this.contentContainer.innerHTML = postHTML;
        this.addCardEventListeners(post);
        document.title = `${title} - Detailed Post`;
    }

    addCardEventListeners(post) {
        const pinterestButtons = this.contentContainer.querySelectorAll('.pinterest-pin-btn');
        pinterestButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    }

    showError(message) {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = `
                <div style="padding: 40px; text-align: center;">
                    <h2 style="color: #dc3545;">⚠️ ${message}</h2>
                    <p>Please try again or go back to the <a href="?page=posts">posts page</a>.</p>
                </div>
            `;
        }
    }
}

// Fonction globale pour charger une poste
function loadPost(postSlug) {
    const newUrl = `${window.location.origin}${window.location.pathname}?page=post-detail&slug=${postSlug}`;
    window.location = newUrl;
}

// ✅ CORRECTION: Initialisation simplifiée sans boucles infinies
let postDetailLoaderInstance = null;
let initAttempts = 0;
const maxInitAttempts = 5; // ✅ Réduit de 20 à 5

function initPostDetail() {
    initAttempts++;
    
    if (initAttempts > maxInitAttempts) {
        // console.error('❌ Max init attempts reached');
        return;
    }
    
    if (postDetailLoaderInstance && postDetailLoaderInstance.initialized) {
        // console.log('✅ Already initialized');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isPostDetailPage = urlParams.get('page') === 'post-detail' || 
                             urlParams.get('slug') || 
                             window.location.href.includes('post-detail');
    
    if (!isPostDetailPage) {
        // console.log('ℹ️ Not on post-detail page, skipping initialization');
        return;
    }

    postDetailLoaderInstance = new PostDetailLoader();
    window.PostDetailLoader = postDetailLoaderInstance;
    
    postDetailLoaderInstance.init().catch(error => {
        // console.error('💥 Initialization failed:', error);
    });
}

// ✅ CORRECTION: Un seul point d'entrée avec { once: true }
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initPostDetail, 100);
    }, { once: true });
} else {
    setTimeout(initPostDetail, 100);
}

// Fonction pour imprimer la poste
function printPost() {
    const postCard = document.querySelector('.Post-summary-card');
    
    if (!postCard) {
        alert('Post card not found');
        return;
    }
    
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
                    display: none;
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
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            ${postCard.innerHTML}
        </body>
        </html>
    `;
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(printContent);
    doc.close();
    
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 1000);
}

// Fonction pour scroller vers la poste
function jumpToPost() {
    const postCard = document.querySelector('.Post-summary-card');
    
    if (!postCard) {
        alert('Post card not found');
        return;
    }
    
    postCard.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
    });
    
    postCard.style.transition = 'box-shadow 0.3s, transform 0.3s';
    postCard.style.boxShadow = '0 0 20px rgba(255, 193, 7, 0.5)';
    postCard.style.transform = 'scale(1.01)';
    
    setTimeout(() => {
        postCard.style.boxShadow = '';
        postCard.style.transform = '';
    }, 1000);
}

// Délégation d'événements pour les boutons
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

window.forceInitPostDetail = function() {
    postDetailLoaderInstance = null;
    initAttempts = 0;
    initPostDetail();
};