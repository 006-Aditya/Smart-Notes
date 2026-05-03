import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import User from "./User.js";

const DocMeta = sequelize.define(
  "DocMeta",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pineconeIds: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },

    expectedQuestions: {
      type: DataTypes.JSONB,   // store array of questions
      allowNull: true,
      defaultValue: [],
    },

    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    tableName: "documents",
  }
);

// Relations
User.hasMany(DocMeta, { foreignKey: "userId" });
DocMeta.belongsTo(User, { foreignKey: "userId" });

export default DocMeta;