import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import User from "./User.js";
import DocMeta from "./DocMeta.js";

const StudyPlan = sequelize.define(
  "StudyPlan",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    examDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    totalDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    dailyPlan: {
      // Array of { day: 1, date: "2024-01-15", topics: [...], tasks: [...], hours: 2 }
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    overview: {
      // Short summary of document content
      type: DataTypes.TEXT,
      allowNull: true,
    },
    keyTopics: {
      // Top-level topics extracted from document
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
    },
    status: {
      type: DataTypes.ENUM("active", "completed", "archived"),
      defaultValue: "active",
    },
  },
  {
    timestamps: true,
    tableName: "study_plans",
  }
);

// Relations
User.hasMany(StudyPlan, { foreignKey: "userId" });
StudyPlan.belongsTo(User, { foreignKey: "userId" });

DocMeta.hasMany(StudyPlan, { foreignKey: "docId" });
StudyPlan.belongsTo(DocMeta, { foreignKey: "docId" });

export default StudyPlan;