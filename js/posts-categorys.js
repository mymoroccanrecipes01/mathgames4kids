class PostLoader {
    constructor(containerId = 'items') {
        this.containerId = containerId;
        this.PostsContainer = null;
        this.postsPath = './Posts/';
        this.categoriesPath = './categories/'; // NOUVEAU: Chemin vers les catégories
        this.allPosts = [];
        this.filteredPosts = [];
        this.displayedPosts = [];
        this.currentPage = 0;
        this.PostsPerPage = 6;
        this.isLoading = false;
        this.hasMorePosts = true;
        this.initialized = false;
        this.currentCategorySlug = null;
        this.categoryMapping = {}; // NOUVEAU: Stockage du mapping des catégories
    }

    async init() {
        if (this.initialized) return;
        
        this.waitForContainer();
        
        if (!this.PostsContainer) {
            // console.error(`Container avec l'ID '${this.containerId}' non trouvé`);
            return false;
        }

        // NOUVEAU: Charger le mapping des catégories en premier
        await this.loadCategoryMapping();
        
        // Charger toutes les postes
        await this.loadAllPosts();
        
        // Appliquer les filtres initiaux (y compris catégorie depuis l'URL)
        this.applyUrlFilters();
        
        // Configurer le scroll infini
        this.setupInfiniteScroll();
        
        // Écouter les changements d'URL et les événements de page
        window.addEventListener('popstate', () => {
            this.resetPagination();
            this.applyUrlFilters();
        });

        // Écouter l'événement pageLoaded du router
        window.addEventListener('pageLoaded', (event) => {
            if (event.detail && event.detail.params && event.detail.params.categorySlug) {
                const categorySlug = event.detail.params.categorySlug;
                // console.log('PostLoader: Catégorie reçue du router:', categorySlug);
                this.filterByCategory(categorySlug);
            }
        });

        this.initialized = true;
        return true;
    }

    async loadCategoryMapping() {
        try {
            // console.log('Chargement du mapping des catégories...');
            const response = await fetch(`${this.categoriesPath}index.json`);
            
            if (!response.ok) {
                // console.warn('Fichier categories/index.json non trouvé, utilisation du mapping par défaut');
                this.categoryMapping = {};
                return;
            }
            
            const data = await response.json();
            
            if (data.folders && typeof data.folders === 'object') {
                this.categoryMapping = data.folders;
                // console.log('Mapping des catégories chargé:', this.categoryMapping);
            } else {
                // console.warn('Format invalide dans categories/index.json');
                this.categoryMapping = {};
            }
            
        } catch (error) {
            // console.error('Erreur lors du chargement du mapping des catégories:', error);
            this.categoryMapping = {};
        }
    }

    waitForContainer() {
        const maxAttempts = 50;
        const baseDelay = 100;
        
        for (let i = 0; i < maxAttempts; i++) {
            this.PostsContainer = document.getElementById(this.containerId);
            if (this.PostsContainer) {
                // console.log(`Container '${this.containerId}' trouvé après ${i + 1} tentative(s)`);
                return;
            }
            
            const delay = baseDelay * (i < 10 ? 1 : 2);
            if (i % 10 === 0) {
                // console.log(`Tentative ${i + 1}/${maxAttempts} - Container '${this.containerId}' non trouvé, attente...`);
            }
        }
        // console.error(`Container '${this.containerId}' non trouvé après ${maxAttempts} tentatives`);
    }

     getIdFromSlug(categorySlug) {
        // Utiliser le mapping chargé depuis categories/index.json
        const mappedId = this.categoryMapping[categorySlug];
        
        if (mappedId) {
            // console.log(`Mapping trouvé: "${categorySlug}" -> "${mappedId}"`);
            return mappedId;
        }
        
        // console.log(`Aucun mapping trouvé pour "${categorySlug}", utilisation du slug comme ID`);
        return categorySlug;
    }

    // NOUVEAU: Méthode pour filtrer par slug de catégorie
 filterByCategory(categorySlug) {
        // console.log('=== FILTRAGE PAR CATÉGORIE ===');
        // console.log('Slug de catégorie:', categorySlug);
        // console.log('Mapping disponible:', this.categoryMapping);
        
        this.currentCategorySlug = categorySlug;
        
        // Convertir le slug en ID en utilisant le mapping chargé
        const categoryId = this.getIdFromSlug(categorySlug);
        // console.log(`Conversion finale: "${categorySlug}" -> "${categoryId}"`);
        
        this.resetPagination();
        
        this.filteredPosts = this.allPosts.filter(Post => {
            if (!Post.category_id && !Post.category) {
                // console.log(`✗ poste "${Post.title}" - pas de catégorie définie`);
                return false;
            }
            
            // console.log(`Vérification poste "${Post.title}":`, {
            //     category_id: Post.category_id,
            //     category: Post.category,
            //     targetSlug: categorySlug,
            //     targetId: categoryId
            // });
            
            // 1. Correspondance exacte avec l'ID mappé
            if (Post.category_id === categoryId) {
                // console.log(`✓ Correspondance ID mappé: "${Post.title}"`);
                return true;
            }
            
            // 2. Correspondance directe avec le slug (fallback)
            if (Post.category_id === categorySlug) {
                // console.log(`✓ Correspondance slug direct: "${Post.title}"`);
                return true;
            }
            
            // 3. Correspondance avec le nom de catégorie slugifié
            if (Post.category && this.slugify(Post.category) === categorySlug) {
                // console.log(`✓ Correspondance nom slugifié: "${Post.title}"`);
                return true;
            }
            
            // 4. Correspondance partielle (fallback pour compatibilité)
            if (Post.category_id && Post.category_id.toLowerCase().includes(categorySlug.toLowerCase())) {
                // console.log(`✓ Correspondance partielle ID: "${Post.title}"`);
                return true;
            }
            
            if (Post.category && Post.category.toLowerCase().includes(categorySlug.toLowerCase())) {
                // console.log(`✓ Correspondance partielle nom: "${Post.title}"`);
                return true;
            }
            
            // console.log(`✗ Aucune correspondance: "${Post.title}"`);
            return false;
        });
        
        // console.log(`Filtrage terminé: ${this.filteredPosts.length} postes trouvées pour "${categorySlug}"`);
        // console.log('==============================');
        
        this.hasMorePosts = this.filteredPosts.length > 0;
        this.displayInitialPosts();
        this.updateFilterInfo({ category: categorySlug }, this.filteredPosts.length);
    }

    debugCategories() {
        // console.log('=== DEBUG CATEGORIES & MAPPING ===');
        // console.log('Mapping chargé:', this.categoryMapping);
        // console.log('Nombre total de postes:', this.allPosts.length);
        
        const categories = new Set();
        const categoryDetails = [];
        
        this.allPosts.forEach(Post => {
            if (Post.category_id) categories.add(Post.category_id);
            if (Post.category) categories.add(Post.category);
            
            categoryDetails.push({
                title: Post.title,
                category_id: Post.category_id,
                category: Post.category,
                category_slugified: Post.category ? this.slugify(Post.category) : null
            });
        });
        
        // console.log('Catégories uniques dans les postes:', [...categories]);
        // console.log('Slugs disponibles dans le mapping:', Object.keys(this.categoryMapping));
        // console.log('IDs dans le mapping:', Object.values(this.categoryMapping));
        // console.log('Détails par poste:', categoryDetails);
        
        // Vérifier les correspondances
        // console.log('=== VÉRIFICATION CORRESPONDANCES ===');
        Object.keys(this.categoryMapping).forEach(slug => {
            const id = this.categoryMapping[slug];
            const matchingPosts = this.allPosts.filter(r => r.category_id === id);
            // console.log(`Slug "${slug}" (ID: ${id}) -> ${matchingPosts.length} postes`);
        });
        
        // console.log('==================================');
        
        return { 
            mapping: this.categoryMapping,
            categories: [...categories], 
            details: categoryDetails 
        };
    }
    

    // Configuration du scroll infini
    setupInfiniteScroll() {
        let scrollTimeout;
        const params = new URLSearchParams(window.location.search);
        const page = params.get("page") || "home";
        
        const handleScroll = () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            scrollTimeout = setTimeout(() => {
                if (this.isLoading || !this.hasMorePosts) {
                    return;
                }

                const scrollPosition = window.scrollY + window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;
                
                // Charger plus de postes quand on est à 200px du bas
                if (page !== "home" && scrollPosition >= documentHeight - 200) {
                    this.loadMorePosts();
                }
            }, 100);
        };

        window.addEventListener('scroll', handleScroll);
        
        // Nettoyer l'event listener si nécessaire
        this.scrollCleanup = () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
        };
    }

    // Réinitialiser la pagination
    resetPagination() {
        this.currentPage = 0;
        this.displayedPosts = [];
        this.hasMorePosts = true;
        this.isLoading = false;
        
        // Vider le container
        if (this.PostsContainer) {
            this.PostsContainer.innerHTML = '';
        }
    }

    // MODIFIÉ: Parser les paramètres URL pour supporter le nouveau format
    getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('page') || 'home';
        
        let category = urlParams.get('category'); // Ancien format
        let categorySlug = null;
        
        // NOUVEAU: Parser le format posts-category/slug
        if (pageParam.includes('/')) {
            const parts = pageParam.split('/');
            if (parts[0] === 'posts-category' && parts[1]) {
                categorySlug = parts[1];
            }
        }
        
        // Utiliser le slug si disponible, sinon l'ancien format
        const finalCategory = categorySlug || category;
        
        return {
            category: finalCategory,
            categorySlug: categorySlug,
            search: urlParams.get('search'),
            difficulty: urlParams.get('difficulty')
        };
    }

    getValueByKey(object, key) {
        return object.hasOwnProperty(key) ? object[key] : undefined;
    }

    applyUrlFilters() {
        const params = this.getUrlParams();
        let filteredPosts = [...this.allPosts];
        if (!params.category)
            params.category = '';      
        // // console.log('Slugs disponibles dans le mapping:', params.category);
        // // console.log('IDs dans le mapping:', Object.values(params.category));
        // // console.log('keys dans le mapping:', this.getValueByKey(this.categoryMapping, params.category));
        
        // Vérifier les correspondances
        // // console.log('=== VÉRIFICATION CORRESPONDANCES ===');
        // Object.keys(this.categoryMapping).forEach(slug => {
        //     const id = this.categoryMapping[slug];
        //     const matchingPosts = this.allPosts.filter(r => r.category_id === id);
        //     // console.log(`Slug "${slug}" (ID: ${id}) -> ${matchingPosts.length} postes`);
        // });



        // console.log('=== APPLICATION DES FILTRES URL ===');
        // console.log('Paramètres détectés:', params.category);
        // MODIFIÉ: Filtrer par catégorie (nouveau format prioritaire)
        if (params.categorySlug || params.category) {
            const categoryToFilter = this.getValueByKey(this.categoryMapping, params.category);
            this.currentCategorySlug = categoryToFilter;
            
            filteredPosts = filteredPosts.filter(Post => {
                if (!Post.category_id && !Post.category) return false;
                
                // Correspondance exacte avec category_id
                if (Post.category_id === categoryToFilter) {
                    return true;
                }
                
                // Correspondance avec nom slugifié
                if (this.slugify(Post.category || '') === categoryToFilter) {
                    return true;
                }
                
                // Correspondance partielle
                if (Post.category_id && Post.category_id.includes(categoryToFilter)) {
                    return true;
                }
                
                if (Post.category && Post.category.toLowerCase().includes(categoryToFilter.toLowerCase())) {
                    return true;
                }
                
                return false;
            });
            
            // console.log(`Filtrage par catégorie "${categoryToFilter}": ${filteredPosts.length} postes trouvées`);
        }

        // Filtrer par recherche
        if (params.search) {
            const searchTerm = params.search.toLowerCase();
            filteredPosts = filteredPosts.filter(Post => 
                Post.title.toLowerCase().includes(searchTerm) ||
                Post.description.toLowerCase().includes(searchTerm) ||
                Post.category.toLowerCase().includes(searchTerm) ||
                (Post.ingredients && Post.ingredients.some(ing => 
                    ing.toLowerCase().includes(searchTerm)
                )) ||
                (Post.tips && Post.tips.toLowerCase().includes(searchTerm))
            );
        }

        // Filtrer par difficulté
        if (params.difficulty) {
            filteredPosts = filteredPosts.filter(Post => 
                Post.difficulty && 
                Post.difficulty.toLowerCase() === params.difficulty.toLowerCase()
            );
        }

        // Mettre à jour les postes filtrées
        this.filteredPosts = filteredPosts;
        this.hasMorePosts = this.filteredPosts.length > 0;
        
        // Afficher les premières postes
        this.displayInitialPosts();
        this.updateFilterInfo(params, this.filteredPosts.length);
    }

    // Afficher les premières postes selon la page
    displayInitialPosts() {     
        this.resetPagination();
        this.loadMorePosts();        
    }

    // Charger plus de postes (6 par 6)
    async loadMorePosts() {
        const params = new URLSearchParams(window.location.search);
        const pageParam = params.get("page") || "home";
        
        // Détecter la page actuelle (y compris le format slug)
        let currentPage = pageParam;
        if (pageParam.includes('/')) {
            currentPage = pageParam.split('/')[0];
        }
        
        // Ne jamais charger plus sur la page home
        if (currentPage === "home") {
            return;
        }

        if (this.isLoading || !this.hasMorePosts) {
            return;
        }

        this.isLoading = true;
        this.showLoadingIndicator();

        try {
            const startIndex = this.currentPage * this.PostsPerPage;
            const endIndex = startIndex + this.PostsPerPage;
            const newPosts = this.filteredPosts.slice(startIndex, endIndex);
            
            if (newPosts.length === 0) {
                this.hasMorePosts = false;
                return;
            }

            // Simuler un petit délai pour le loading
            await new Promise(resolve => setTimeout(resolve, 300));     
            
            // Ajouter les nouvelles postes
            this.displayedPosts.push(...newPosts);
            this.appendPostsToDOM(newPosts);
            
            this.currentPage++;
            this.hasMorePosts = endIndex < this.filteredPosts.length;

            // console.log(`Page ${this.currentPage} chargée: ${newPosts.length} postes (${this.displayedPosts.length}/${this.filteredPosts.length} total)`);
            
        } catch (error) {
            // console.error('Erreur lors du chargement de plus de postes:', error);
            this.showError('Erreur lors du chargement des postes supplémentaires');
        } finally {
            this.hideLoadingIndicator();
            this.isLoading = false;
        }
    }

    // Ajouter les postes au DOM
    appendPostsToDOM(Posts) {
        if (!this.PostsContainer) {
            // console.error('Container des postes non disponible');
            return;
        }

        if (Posts.length === 0) {
            if (this.displayedPosts.length === 0) {
                const categoryInfo = this.currentCategorySlug ? 
                    ` pour la catégorie "${this.currentCategorySlug}"` : '';
                
                this.PostsContainer.innerHTML = `
                    <div class="no-Posts">
                        <h3>Aucune poste trouvée</h3>
                        <p>Aucune poste ne correspond aux filtres sélectionnés${categoryInfo}</p>
                        ${this.currentCategorySlug ? `
                            <button onclick="window.router.loadPage('Posts')" class="btn-secondary" style="
                                background: #007bff; color: white; border: none; padding: 10px 20px; 
                                border-radius: 5px; cursor: pointer; margin-top: 15px;
                            ">
                                View all Posts.
                            </button>
                        ` : ''}
                    </div>
                `;
            }
            return;
        }

       
        const PostsHTML = Posts.map(Post => this.createPostHTML(Post)).join('');             
        this.PostsContainer.insertAdjacentHTML('beforeend', PostsHTML);
          
    }

    // Afficher l'indicateur de chargement
    showLoadingIndicator() {
        // Supprimer l'ancien indicateur s'il existe
        const existingLoader = document.querySelector('.loading-more');
        if (existingLoader) {
            existingLoader.remove();
        }

        const loader = document.createElement('div');
        loader.className = 'loading-more';
        loader.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="spinner" style="
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 10px;
                "></div>
                <p>Loading more ...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;

        if (this.PostsContainer && this.PostsContainer.parentNode) {
            this.PostsContainer.parentNode.appendChild(loader);
        }
    }

    // Masquer l'indicateur de chargement
    hideLoadingIndicator() {
        const loader = document.querySelector('.loading-more');
        if (loader) {
            loader.remove();
        }
    }

    // MODIFIÉ: Info de filtrage améliorée pour les catégories
    updateFilterInfo(params, resultCount) {
        // Supprimer l'ancienne info
        const existingInfo = document.querySelector('.filter-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        // Créer l'info des filtres si actifs
        const activeFilters = [];
        if (params.categorySlug || params.category) {
            const categoryName = params.categorySlug || params.category;
            activeFilters.push(`${categoryName}`);
        }
        if (params.search) activeFilters.push(`Recherche: "${params.search}"`);
        if (params.difficulty) activeFilters.push(`Difficulté: ${params.difficulty}`);

        if (activeFilters.length > 0 || resultCount !== this.allPosts.length) {
            const filterInfo = document.createElement('section');
            filterInfo.className = 'category-hero';
            filterInfo.innerHTML = `
                
                    <div class="container" bis_skin_checked="1">
                        <h1 style="text-transform: uppercase;">${activeFilters.map(filter => `${filter}`).join('')}
                        </h1>                              
                    </div>
                `;
            // filterInfo.innerHTML = `
            //     <div class="filter-tags" style="
            //         background: #f8f9fa;
            //         padding: 15px;
            //         margin-bottom: 20px;
            //         border-radius: 8px;
            //         border-left: 4px solid #007bff;
            //     ">
            //         <span class="filter-count" style="font-weight: 600; margin-right: 15px;">
            //             ${resultCount} poste(s) trouvée(s) 
            //         </span>
            //         ${activeFilters.map(filter => `
            //             <span class="filter-tag" style="
            //                 background: #007bff;
            //                 color: white;
            //                 padding: 4px 8px;
            //                 border-radius: 12px;
            //                 font-size: 0.9em;
            //                 margin-right: 8px;
            //             ">${filter}</span>
            //         `).join('')}
            //         ${activeFilters.length > 0 ? `
            //             <button class="clear-filters" onclick="PostLoader.clearFilters()" style="
            //                 background: #dc3545;
            //                 color: white;
            //                 border: none;
            //                 padding: 4px 12px;
            //                 border-radius: 4px;
            //                 cursor: pointer;
            //                 font-size: 0.9em;
            //             ">Effacer les filtres</button>
            //         ` : ''}
            //     </div>
            // `;
            
            // Insérer avant le container de postes
            if (this.PostsContainer && this.PostsContainer.parentNode) {
                this.PostsContainer.parentNode.insertBefore(filterInfo, this.PostsContainer);
            }
        }
    }

    clearFilters() {
        // Rediriger vers la page Posts normale
        if (window.router && window.router.loadPage) {
            window.router.loadPage('Posts');
        } else {
            window.history.pushState({}, '', window.location.pathname + '?page=posts');
            window.location.reload();
        }
    }

    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[ñ]/g, 'n')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
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
        
        const commonPostNames = [
            'cattle-ranch-casserole', 'cattle-ranch-casserole-2',
            'slow-cooker-cowboy-casserole', 'slow-cooker-cowboy-casserole-1',
            'red-lobster-shrimp-scampi-1',
            'apple-harvest-squares', 'chocolate-chip-cookies', 'pasta-carbonara',
            'chicken-tikka-masala', 'banana-bread', 'beef-stew', 'caesar-salad',
            'pancakes', 'pizza-margherita', 'tiramisu', 'lasagna', 'tacos',
            'burger', 'sandwich', 'curry', 'stir-fry', 'grilled-chicken',
            'chocolate-cake', 'apple-pie', 'french-toast', 'omelette',
            'beef-bourguignon', 'chicken-soup', 'vegetable-soup',
            'casserole', 'cowboy-casserole', 'ranch-style', 'slow-cooker-beef',
            'comfort-food', 'hearty-meal', 'family-dinner'
        ];

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

    async loadAllPosts() {
        try {
            const params = new URLSearchParams(window.location.search);
            const pageParam = params.get("page") || "home";
            
            // Détecter la page actuelle
            let currentPage = pageParam;
            if (pageParam.includes('/')) {
                currentPage = pageParam.split('/')[0];
            }
            
            const PostFolders = await this.getPostFolders();
            
            if (PostFolders.length === 0) {
                this.showNoPosts();
                return;
            }

            // console.log(`${PostFolders.length} dossiers de postes trouvés pour la page "${currentPage}":`, PostFolders);

            const PostPromises = PostFolders.map(folder => 
                this.loadPostData(folder)
            );
            
            const Posts = await Promise.all(PostPromises);
            const validPosts = Posts.filter(Post => Post !== null && Post.isOnline === true);
            
            
            if (validPosts.length === 0) {
                this.showError('Aucune poste valide trouvée dans les dossiers spécifiés');
                return;
            }

            // Trier par date de création (plus récent en premier)
            validPosts.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.updatedAt || Date.now());
                const dateB = new Date(b.createdAt || b.updatedAt || Date.now());
                return dateB - dateA; // Ordre décroissant (plus récent en premier)
            });
            
            // Sur la page home, prendre seulement les 6 premières après tri par date
            if (currentPage === "home") {
                this.allPosts = validPosts.slice(0, 6);
                // console.log(`Page home: ${this.allPosts.length} postes les plus récentes affichées`);
            } else {
                this.allPosts = validPosts;
            }
            
            // console.log(`postes triées par date de création (${this.allPosts.length} postes)`);

        } catch (error) {
            // console.error('Erreur lors du chargement des postes:', error);
            this.showError('Erreur lors du chargement des postes');
        }
    }

    // Méthode displayInitialPosts modifiée pour gérer la page home et les catégories
    displayInitialPosts() {
        const params = new URLSearchParams(window.location.search);
        const pageParam = params.get("page") || "home";
        
        // Détecter la page actuelle
        let currentPage = pageParam;
        if (pageParam.includes('/')) {
            currentPage = pageParam.split('/')[0];
        }
        
        this.resetPagination();
        
        if (currentPage === "home") {
            // Sur la page home, afficher directement toutes les postes filtrées
            // (qui sont déjà limitées à 6 dans loadAllPosts)
            this.displayedPosts = [...this.filteredPosts];
            this.appendPostsToDOM(this.displayedPosts);
            this.hasMorePosts = false; // Pas de load more sur home
            // console.log(`Page home: ${this.displayedPosts.length} postes affichées (pas de pagination)`);
        } else {
            // Sur les autres pages, utiliser la pagination normale
            this.loadMorePosts();
        }
    }

    async loadPostData(folderName) {
        try {
            const jsonUrl = `${this.postsPath}${folderName}/Post.json`;
            const jsonResponse = await fetch(jsonUrl);
            
            if (!jsonResponse.ok) {
                // console.warn(`Impossible de charger ${folderName}/Post.json`);
                return null;
            }
            
            const PostData = await jsonResponse.json();
            
            if (!PostData.title) {
                // console.warn(`poste ${folderName}: titre manquant`);
                return null;
            }
            
            const mainImage = this.getMainImageFromData(PostData);
            const prepTime = PostData.prep_time ? `${PostData.prep_time} min` : null;
            const cookTime = PostData.cook_time ? `${PostData.cook_time} min` : null;
            const totalTime = PostData.total_time ? `${PostData.total_time} min` : null;
            
            return {
                id: PostData.id,
                slug: PostData.slug || folderName,
                folderName,
                title: PostData.title,
                description: PostData.description || 'Description non disponible',
                category: this.getCategoryName(PostData.category_id) || 'Général',
                category_id: PostData.category_id, // IMPORTANT: Garder l'ID original
                difficulty: PostData.difficulty || 'Non spécifié',
                prepTime,
                cookTime,
                totalTime,
                servings: PostData.servings,
                ingredients: PostData.ingredients || [],
                instructions: PostData.instructions || [],
                tips: PostData.tips,
                mainImage,
                images: PostData.images || [],
                hasRichStructure: PostData.has_rich_structure || false,
                createdAt: PostData.createdAt,
                updatedAt: PostData.updatedAt,
                ...PostData
            };
            
        } catch (error) {
            // console.error(`Erreur lors du chargement de la poste ${folderName}:`, error);
            return null;
        }
    }

    getMainImageFromData(PostData) {
        if (PostData.image_path) {
            return `./${PostData.image_path}`;
        }
        
        if (PostData.images && Array.isArray(PostData.images)) {
            const mainImg = PostData.images.find(img => img.type === 'main');
            if (mainImg && mainImg.filePath) {
                return `./${mainImg.filePath}`;
            }
            
            if (PostData.images.length > 0 && PostData.images[0].filePath) {
                return `./${PostData.images[0].filePath}`;
            }
        }
        
        if (PostData.image) {
            const imageDir = PostData.image_dir || `${PostData.slug || PostData.folderName}/images`;
            return `./Posts/${imageDir}/${PostData.image}`;
        }
        
        return this.findMainImage(PostData.slug || PostData.folderName);
    }

    getCategoryName(categoryId) {
        const categoryMap = {
            // Ajouter votre mapping de catégories ici si nécessaire
        };
        
        return categoryMap[categoryId] || categoryId;
    }

    async findMainImage(folderName) {
        const commonImageNames = [
            'main.jpg', 'main.jpeg', 'main.png',
            'featured.jpg', 'featured.jpeg', 'featured.png',
            'image.jpg', 'image.jpeg', 'image.png',
            'cover.jpg', 'cover.jpeg', 'cover.png',
            'hero.jpg', 'hero.jpeg', 'hero.png'
        ];
        
        const imagesPath = `${this.postsPath}${folderName}/images/`;
        
        for (const imageName of commonImageNames) {
            try {
                const imageUrl = imagesPath + imageName;
                const response = await fetch(imageUrl, { method: 'HEAD' });
                if (response.ok) {
                    return imageUrl;
                }
            } catch (error) {
                continue;
            }
        }
        
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f8f9fa"/><text x="200" y="150" font-family="Arial" font-size="18" fill="%236c757d" text-anchor="middle">Image non disponible</text></svg>';
    }

createPostHTML(Post) {
    // Utiliser des valeurs par défaut pour éviter les erreurs de déstructuration
    const slug = Post.slug || Post.folderName || Post.id || 'Post';
    const folderName = Post.folderName || Post.slug || Post.id || 'Post';
    const title = Post.title || 'Titre non disponible';
    const description = Post.description || 'Description non disponible';
    const category = Post.category || 'Général';
    const difficulty = Post.difficulty || 'Non spécifié';
    const mainImage = Post.mainImage || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f8f9fa"/><text x="200" y="150" font-family="Arial" font-size="18" fill="%236c757d" text-anchor="middle">Image non disponible</text></svg>';

    const PostUrl = window.createPostUrl ? window.createPostUrl(slug) : 
                     `base.html?page=post-detail&slug=${slug}`;
    
    return `
        <div class="entry" data-category="${this.slugify(category)}" data-difficulty="${difficulty.toLowerCase()}">
            <a class="entry__img" href="${PostUrl}" title="${title}">
                <img alt="${title}" 
                     loading="lazy" 
                     decoding="async" 
                     width="400" 
                     height="300" 
                     src="${mainImage}"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;400&quot; height=&quot;300&quot; viewBox=&quot;0 0 400 300&quot;><rect width=&quot;400&quot; height=&quot;300&quot; fill=&quot;%23f8f9fa&quot;/><text x=&quot;200&quot; y=&quot;150&quot; font-family=&quot;Arial&quot; font-size=&quot;18&quot; fill=&quot;%236c757d&quot; text-anchor=&quot;middle&quot;>Image non disponible</text></svg>'">
            </a>
            
            <div class="entry__body">
                <a href="${PostUrl}" title="${title}" class="entry__title">
                    ${title}
                </a>
                <p class="entry__description">${description}</p>
            </div>
            
            <div class="entry__footer">
                <a class="entry__footer-link" href="${PostUrl}" title="${title}">
                    View the Post
                </a>
            </div>
        </div>
    `;
}

    showError(message) {
        this.PostsContainer.innerHTML = `<div class="error">${message}</div>`;
    }

    showNoPosts() {
        this.PostsContainer.innerHTML = `
            <div class="no-Posts">
                <h3>Sorry, no Posts found</h3>
                <p>Please make sure your Post folders contain <code>Post.json</code> files.</p>
                <p><strong>Tip:</strong> Create a <code>Posts/index.json</code> file with the list of your folders:</p>
                <pre style="background: #f8f9fa; padding: 12px; border-radius: 4px; font-size: 0.9em; margin-top: 12px;">["cattle-ranch-casserole", "slow-cooker-cowboy-casserole"]</pre>
            </div>
        `;
    }

    // Méthode pour nettoyer les event listeners
    destroy() {
        if (this.scrollCleanup) {
            this.scrollCleanup();
        }
    }

    // NOUVEAU: Méthode publique pour obtenir la catégorie actuelle
    getCurrentCategory() {
        return this.currentCategorySlug;
    }

    // NOUVEAU: Méthode publique pour obtenir les postes filtrées
    getFilteredPosts() {
        return this.filteredPosts;
    }

    // NOUVEAU: Méthode pour réinitialiser complètement le loader
    reset() {
        this.resetPagination();
        this.currentCategorySlug = null;
        this.filteredPosts = [...this.allPosts];
        this.hasMorePosts = true;
    }
}

// Variables globales

let pageLoadWatcher;

class PageLoadWatcher {
    constructor() {
        this.initialized = false;
        this.attempts = 0;
        this.maxAttempts = 100;
        this.baseInterval = 100;
        this.watchInterval = null;
    }

    startWatching() {
        if (this.initialized) return;

        // console.log('Début de surveillance du chargement de page...');
        
        this.watchInterval = setInterval(() => {
            this.attempts++;
            
            const container = document.getElementById('items');
            const hasContent = container && container.innerHTML && !container.innerHTML.includes('Loading...');
            
            if (container ) {
                this.initializePostLoader();
            } else if (this.attempts >= this.maxAttempts) {
                // console.warn('Arrêt de la surveillance après', this.maxAttempts, 'tentatives');
                this.stopWatching();
            }
        }, this.baseInterval);
    }

    async initializePostLoader() {
        if (this.initialized) return;
        
        this.stopWatching();
        this.initialized = true;
        
        try {
            // console.log('Initialisation du PostLoader avec support des catégories slug...');
            PostLoader = new PostLoader('items');
            
            // Rendre accessible globalement
            window.PostLoader = PostLoader;
            
            const success = await PostLoader.init();
            
            if (success) {
                // console.log('PostLoader initialisé avec succès - Support des catégories slug activé');
            } else {
                // console.error('Échec de l\'initialisation du PostLoader');
            }
        } catch (error) {
            // console.error('Erreur lors de l\'initialisation:', error);
        }
    }

    stopWatching() {
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
            this.watchInterval = null;
        }
    }

    reset() {
        this.initialized = false;
        this.attempts = 0;
        this.stopWatching();
    }
}

// NOUVEAU: Fonction d'initialisation pour les pages de catégorie
function initPostsCategoryPageFeatures(categorySlug) {
    // console.log('=== INIT CATEGORY FEATURES ===');
    // console.log('Category slug reçu:', categorySlug);
    // console.log('PostLoader exists:', !!PostLoader);
    // console.log('PostLoader initialized:', PostLoader?.initialized);
    // console.log('Nombre de postes totales:', PostLoader?.allPosts?.length);
    
    if (PostLoader && PostLoader.initialized) {
        setTimeout(() => {
            // console.log('Applying filter...');
            PostLoader.filterByCategory(categorySlug);
        }, 100);
    } else {
        // console.log('PostLoader pas prêt, attente...');
        // Reste du code...
    }
}
// Exposer la fonction globalement pour le router
window.initPostsCategoryPageFeatures = initPostsCategoryPageFeatures;

function initPostsystem() {
    if (!pageLoadWatcher) {
        pageLoadWatcher = new PageLoadWatcher();
    }
    pageLoadWatcher.startWatching();
}

// Points d'entrée multiples pour assurer l'initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPostsystem);
} else {
    setTimeout(initPostsystem, 50);
}

window.addEventListener('load', () => {
    setTimeout(initPostsystem, 100);
});

// Observer les changements DOM
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const container = document.getElementById('items');
                if (container && !PostLoader) {
                    initPostsystem();
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

// Fallback d'urgence
setTimeout(() => {
    if (!PostLoader) {
        // console.log('Fallback: Tentative d\'initialisation après 3 secondes');
        initPostsystem();
    }
}, 3000);

// Fonction de recherche
function searchPosts() {
    if (!PostLoader || !PostLoader.initialized) {
        // console.warn('PostLoader pas encore initialisé');
        initPostsystem();
        return;
    }
    
    const searchInput = document.getElementById('search-input') || document.getElementById('Post-search');
    const categorySelect = document.getElementById('category-select') || document.getElementById('category-filter');
    const difficultySelect = document.getElementById('difficulty-select') || document.getElementById('difficulty-filter');
    
    const params = new URLSearchParams();
    
    if (searchInput && searchInput.value.trim()) {
        params.set('search', searchInput.value.trim());
    }
    
    if (categorySelect && categorySelect.value && categorySelect.value !== 'all') {
        params.set('category', categorySelect.value);
    }
    
    if (difficultySelect && difficultySelect.value && difficultySelect.value !== 'all') {
        params.set('difficulty', difficultySelect.value);
    }
    
    // Construire la nouvelle URL
    let newUrl;
    if (params.has('category')) {
        // Utiliser le nouveau format slug pour les catégories
        const categorySlug = params.get('category');
        params.delete('category');
        
        const otherParams = params.toString();
        newUrl = `${window.location.pathname}?page=posts-category/${categorySlug}`;
        if (otherParams) {
            newUrl += `&${otherParams}`;
        }
    } else {
        newUrl = params.toString() ? 
               `${window.location.pathname}?page=posts&${params.toString()}` : 
               `${window.location.pathname}?page=posts`;
    }
    
    // Naviguer vers la nouvelle URL
    if (window.router && window.router.navigateTo) {
        if (params.has('category')) {
            window.router.navigateTo('posts-category', { categorySlug: params.get('category') });
        } else {
            window.history.pushState({}, '', newUrl);
            PostLoader.resetPagination();
            PostLoader.applyUrlFilters();
        }
    } else {
        window.history.pushState({}, '', newUrl);
        PostLoader.resetPagination();
        PostLoader.applyUrlFilters();
    }
}

// Fonction de force init
function forceInitPostLoader() {
    // console.log('Force l\'initialisation du PostLoader...');
    
    if (pageLoadWatcher) {
        pageLoadWatcher.reset();
    }
    
    if (PostLoader) {
        PostLoader.destroy();
        PostLoader = null;
    }
    
    window.PostLoader = null;
    
    // Réinitialiser complètement
    pageLoadWatcher = new PageLoadWatcher();
    initPostsystem();
}

// NOUVEAU: Fonction pour naviguer vers une catégorie
function navigateToCategory(categorySlug) {
    if (window.router && window.router.loadCategoryPage) {
        window.router.loadCategoryPage(categorySlug);
    } else {
        window.location.href = window.createCategoryUrl ? 
                              window.createCategoryUrl(categorySlug) : 
                              `base.html?page=posts-category/${categorySlug}`;
    }
}

// NOUVEAU: Fonction pour obtenir les statistiques de postes
function getPoststats() {
    if (!PostLoader) return null;
    
    return {
        total: PostLoader.allPosts.length,
        filtered: PostLoader.filteredPosts.length,
        displayed: PostLoader.displayedPosts.length,
        currentCategory: PostLoader.currentCategorySlug,
        hasMore: PostLoader.hasMorePosts,
        isLoading: PostLoader.isLoading
    };
}

// Exposer toutes les fonctions publiques
window.searchPosts = searchPosts;
window.forceInitPostLoader = forceInitPostLoader;
window.navigateToCategory = navigateToCategory;
window.getPoststats = getPoststats;

// Debug: Log de l'état du système
// console.log('PostLoader system loaded with category slug support');
// console.log('Available functions:', {
//     searchPosts: typeof searchPosts,
//     forceInitPostLoader: typeof forceInitPostLoader,
//     navigateToCategory: typeof navigateToCategory,
//     getPoststats: typeof getPoststats,
//     initPostsCategoryPageFeatures: typeof initPostsCategoryPageFeatures
// });