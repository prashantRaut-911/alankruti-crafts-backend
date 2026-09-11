import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";

/**
 * Validate a product image URL.
 *
 * Only HTTPS URLs are accepted.
 */
const isValidImageUrl = (url) => {
  if (!url) {
    return true;
  }

  if (typeof url !== "string") {
    return false;
  }

  try {
    const parsedUrl = new URL(url);

    return parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Validate product image fields.
 */
const validateImages = (image, images) => {
  if (image !== undefined && image !== "") {
    if (!isValidImageUrl(image)) {
      return "Main product image must be a valid HTTPS URL.";
    }
  }

  if (images !== undefined) {
    if (!Array.isArray(images)) {
      return "Product images must be an array.";
    }

    if (images.length > 5) {
      return "A product can have a maximum of 5 images.";
    }

    const hasInvalidImage = images.some(
      (url) => !isValidImageUrl(url)
    );

    if (hasInvalidImage) {
      return "All product images must be valid HTTPS URLs.";
    }
  }

  return null;
};

/**
 * Extract Cloudinary public ID from a Cloudinary URL.
 *
 * Example:
 * https://res.cloudinary.com/demo/image/upload/v123/
 * alankruti-crafts/products/example.jpg
 *
 * Returns:
 * alankruti-crafts/products/example
 */
const getCloudinaryPublicId = (url) => {
  if (!url || typeof url !== "string") {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    if (
      !parsedUrl.hostname.includes(
        "res.cloudinary.com"
      )
    ) {
      return null;
    }

    const pathParts = parsedUrl.pathname
      .split("/")
      .filter(Boolean);

    const uploadIndex =
      pathParts.indexOf("upload");

    if (uploadIndex === -1) {
      return null;
    }

    let publicIdParts =
      pathParts.slice(uploadIndex + 1);

    // Remove Cloudinary transformation segments.
    while (
      publicIdParts.length > 0 &&
      (
        publicIdParts[0].startsWith("v") &&
        /^v\d+$/.test(publicIdParts[0])
      ) === false &&
      (
        publicIdParts[0].includes(",") ||
        publicIdParts[0].includes("_")
      )
    ) {
      publicIdParts.shift();
    }

    if (
      publicIdParts.length > 0 &&
      /^v\d+$/.test(publicIdParts[0])
    ) {
      publicIdParts.shift();
    }

    if (!publicIdParts.length) {
      return null;
    }

    const lastIndex =
      publicIdParts.length - 1;

    publicIdParts[lastIndex] =
      publicIdParts[lastIndex].replace(
        /\.[^/.]+$/,
        ""
      );

    return publicIdParts.join("/");
  } catch {
    return null;
  }
};

/**
 * Get all image URLs currently referenced by
 * products other than the specified product.
 */
const getImagesUsedByOtherProducts = async (
  productId
) => {
  const products = await Product.find({
    _id: { $ne: productId },
  })
    .select("image images")
    .lean();

  const usedImages = new Set();

  for (const product of products) {
    if (product.image) {
      usedImages.add(product.image);
    }

    if (Array.isArray(product.images)) {
      product.images.forEach((imageUrl) => {
        if (imageUrl) {
          usedImages.add(imageUrl);
        }
      });
    }
  }

  return usedImages;
};

/**
 * Safely delete Cloudinary images that are
 * no longer referenced by another product.
 */
const cleanupCloudinaryImages = async (
  imageUrls,
  productId
) => {
  if (!Array.isArray(imageUrls) || !imageUrls.length) {
    return;
  }

  const uniqueUrls = [
    ...new Set(
      imageUrls.filter(Boolean)
    ),
  ];

  if (!uniqueUrls.length) {
    return;
  }

  try {
    const usedImages =
      await getImagesUsedByOtherProducts(
        productId
      );

    const publicIds = uniqueUrls
      .filter(
        (url) => !usedImages.has(url)
      )
      .map(getCloudinaryPublicId)
      .filter(Boolean);

    if (!publicIds.length) {
      return;
    }

    await cloudinary.api.delete_resources(
      publicIds,
      {
        resource_type: "image",
        type: "upload",
      }
    );

    console.log(
      `Cloudinary cleanup completed: ${publicIds.length} image(s) removed.`
    );
  } catch (cleanupError) {
    console.error(
      "Cloudinary cleanup failed:",
      cleanupError.message
    );
  }
};

/**
 * Get all products
 *
 * Supports:
 * - Search
 * - Category filter
 * - Availability filter
 * - Featured filter
 * - Sorting
 * - Pagination
 *
 * isAvailable:
 * - true  → available products
 * - false → unavailable products
 * - all   → all products
 */
export const getProducts = async (
  req,
  res,
  next
) => {
  try {
    const {
      search = "",
      category = "",
      featured,
      isAvailable,
      sort = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    const filter = {};

    // Search by product name or description
    if (search.trim()) {
      filter.$or = [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          description: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // Category filter
    if (category.trim()) {
      filter.category = category.trim();
    }

    // Featured filter
    if (featured !== undefined) {
      filter.featured =
        featured === "true";
    }

    // Availability filter
    if (isAvailable === "all") {
      // Admin can request all products.
      // No availability filter is applied.
    } else if (
      isAvailable !== undefined
    ) {
      filter.isAvailable =
        isAvailable === "true";
    } else {
      // Public/customer requests show
      // available products only.
      filter.isAvailable = true;
    }

    // Pagination
    const currentPage = Math.max(
      parseInt(page, 10) || 1,
      1
    );

    const perPage = Math.min(
      Math.max(
        parseInt(limit, 10) || 12,
        1
      ),
      100
    );

    const skip =
      (currentPage - 1) * perPage;

    // Sorting
    let sortOption = {};

    switch (sort) {
      case "price-low":
        sortOption = { price: 1 };
        break;

      case "price-high":
        sortOption = { price: -1 };
        break;

      case "name-asc":
        sortOption = { name: 1 };
        break;

      case "name-desc":
        sortOption = { name: -1 };
        break;

      case "oldest":
        sortOption = { createdAt: 1 };
        break;

      case "newest":
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    const [
      products,
      totalProducts,
    ] = await Promise.all([
      Product.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(perPage),

      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(
      totalProducts / perPage
    );

    res.status(200).json({
      success: true,
      products,
      pagination: {
        currentPage,
        totalPages,
        totalProducts,
        limit: perPage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single product by ID
 */
export const getProduct = async (
  req,
  res,
  next
) => {
  try {
    const product =
      await Product.findById(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new product
 * Admin only
 */
export const createProduct = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
      description,
      price,
      category,
      image,
      images,
      stock,
      isAvailable,
      featured,
    } = req.body;

    if (
      !name ||
      !description ||
      !category
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, description, and category are required.",
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product price is required.",
      });
    }

    if (
      stock === undefined ||
      stock === null ||
      stock === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product stock is required.",
      });
    }

    // Validate image fields
    const imageError =
      validateImages(
        image,
        images
      );

    if (imageError) {
      return res.status(400).json({
        success: false,
        message: imageError,
      });
    }

    const product =
      await Product.create({
        name: name.trim(),
        description:
          description.trim(),
        price: Number(price),
        category: category.trim(),
        image: image || "",
        images: Array.isArray(images)
          ? images
          : [],
        stock: Number(stock),
        isAvailable:
          isAvailable !== undefined
            ? Boolean(isAvailable)
            : true,
        featured:
          featured !== undefined
            ? Boolean(featured)
            : false,
      });

    res.status(201).json({
      success: true,
      message:
        "Product created successfully.",
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing product
 * Admin only
 */
export const updateProduct = async (
  req,
  res,
  next
) => {
  try {
    const product =
      await Product.findById(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const {
      name,
      description,
      price,
      category,
      image,
      images,
      stock,
      isAvailable,
      featured,
    } = req.body;

    // Validate image fields
    const imageError =
      validateImages(
        image,
        images
      );

    if (imageError) {
      return res.status(400).json({
        success: false,
        message: imageError,
      });
    }

    /*
     * Keep track of the old images before
     * changing the product.
     */
    const oldImageUrls = [
      product.image,
      ...(Array.isArray(product.images)
        ? product.images
        : []),
    ].filter(Boolean);

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Product name cannot be empty.",
        });
      }

      product.name =
        String(name).trim();
    }

    if (description !== undefined) {
      if (!String(description).trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Product description cannot be empty.",
        });
      }

      product.description =
        String(description).trim();
    }

    if (price !== undefined) {
      product.price = Number(price);
    }

    if (category !== undefined) {
      if (!String(category).trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Product category cannot be empty.",
        });
      }

      product.category =
        String(category).trim();
    }

    if (image !== undefined) {
      product.image = image || "";
    }

    if (images !== undefined) {
      product.images =
        Array.isArray(images)
          ? images
          : [];
    }

    if (stock !== undefined) {
      product.stock = Number(stock);
    }

    if (isAvailable !== undefined) {
      product.isAvailable =
        isAvailable === true ||
        isAvailable === "true";
    }

    if (featured !== undefined) {
      product.featured =
        featured === true ||
        featured === "true";
    }

    await product.save();

    /*
     * Determine which old images are no longer
     * referenced by this product.
     */
    const newImageUrls = [
      product.image,
      ...(Array.isArray(product.images)
        ? product.images
        : []),
    ].filter(Boolean);

    const removedImageUrls =
      oldImageUrls.filter(
        (oldUrl) =>
          !newImageUrls.includes(oldUrl)
      );

    /*
     * Delete removed Cloudinary assets.
     *
     * Cleanup runs after MongoDB successfully
     * saves the updated product.
     */
    if (removedImageUrls.length) {
      await cleanupCloudinaryImages(
        removedImageUrls,
        product._id
      );
    }

    res.status(200).json({
      success: true,
      message:
        "Product updated successfully.",
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a product
 * Admin only
 */
export const deleteProduct = async (
  req,
  res,
  next
) => {
  try {
    const product =
      await Product.findById(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const imageUrls = [
      product.image,
      ...(Array.isArray(product.images)
        ? product.images
        : []),
    ].filter(Boolean);

    const productId =
      product._id;

    await product.deleteOne();

    /*
     * Cleanup happens after the product has
     * been successfully removed from MongoDB.
     */
    if (imageUrls.length) {
      await cleanupCloudinaryImages(
        imageUrls,
        productId
      );
    }

    res.status(200).json({
      success: true,
      message:
        "Product deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};