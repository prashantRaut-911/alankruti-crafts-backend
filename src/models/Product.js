import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required."],
      trim: true,
      maxlength: [150, "Product name cannot exceed 150 characters."],
    },

    description: {
      type: String,
      required: [true, "Product description is required."],
      trim: true,
      maxlength: [2000, "Product description cannot exceed 2000 characters."],
    },

    price: {
      type: Number,
      required: [true, "Product price is required."],
      min: [0, "Product price cannot be negative."],
    },

    category: {
      type: String,
      required: [true, "Product category is required."],
      trim: true,
      maxlength: [100, "Product category cannot exceed 100 characters."],
    },

    image: {
      type: String,
      trim: true,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    stock: {
      type: Number,
      required: [true, "Product stock is required."],
      min: [0, "Product stock cannot be negative."],
      default: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

export default Product;