
namespace SimTTL
{
    partial class frmSignalSelect
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.pnControl = new System.Windows.Forms.Panel();
            this.btnCancel = new System.Windows.Forms.Button();
            this.btnOK = new System.Windows.Forms.Button();
            this.lbListedSignals = new System.Windows.Forms.ListBox();
            this.lbSelectedSignals = new System.Windows.Forms.ListBox();
            this.pnCenter = new System.Windows.Forms.Panel();
            this.ckbIncludeInputs = new System.Windows.Forms.CheckBox();
            this.btnAddAll = new System.Windows.Forms.Button();
            this.btnRemoveAll = new System.Windows.Forms.Button();
            this.btnRemove = new System.Windows.Forms.Button();
            this.btnAdd = new System.Windows.Forms.Button();
            this.pnLeft = new System.Windows.Forms.Panel();
            this.pnRight = new System.Windows.Forms.Panel();
            this.pnControl.SuspendLayout();
            this.pnCenter.SuspendLayout();
            this.SuspendLayout();
            // 
            // pnControl
            // 
            this.pnControl.Controls.Add(this.btnCancel);
            this.pnControl.Controls.Add(this.btnOK);
            this.pnControl.Dock = System.Windows.Forms.DockStyle.Bottom;
            this.pnControl.Location = new System.Drawing.Point(0, 618);
            this.pnControl.Name = "pnControl";
            this.pnControl.Size = new System.Drawing.Size(800, 36);
            this.pnControl.TabIndex = 0;
            // 
            // btnCancel
            // 
            this.btnCancel.Anchor = System.Windows.Forms.AnchorStyles.None;
            this.btnCancel.DialogResult = System.Windows.Forms.DialogResult.Cancel;
            this.btnCancel.Location = new System.Drawing.Point(426, 7);
            this.btnCancel.Name = "btnCancel";
            this.btnCancel.Size = new System.Drawing.Size(75, 23);
            this.btnCancel.TabIndex = 1;
            this.btnCancel.Text = "Cancel";
            this.btnCancel.UseVisualStyleBackColor = true;
            // 
            // btnOK
            // 
            this.btnOK.Anchor = System.Windows.Forms.AnchorStyles.None;
            this.btnOK.DialogResult = System.Windows.Forms.DialogResult.OK;
            this.btnOK.Location = new System.Drawing.Point(285, 7);
            this.btnOK.Name = "btnOK";
            this.btnOK.Size = new System.Drawing.Size(75, 23);
            this.btnOK.TabIndex = 0;
            this.btnOK.Text = "OK";
            this.btnOK.UseVisualStyleBackColor = true;
            // 
            // lbListedSignals
            // 
            this.lbListedSignals.Dock = System.Windows.Forms.DockStyle.Left;
            this.lbListedSignals.FormattingEnabled = true;
            this.lbListedSignals.Location = new System.Drawing.Point(10, 0);
            this.lbListedSignals.Name = "lbListedSignals";
            this.lbListedSignals.SelectionMode = System.Windows.Forms.SelectionMode.MultiExtended;
            this.lbListedSignals.Size = new System.Drawing.Size(332, 618);
            this.lbListedSignals.TabIndex = 1;
            this.lbListedSignals.DoubleClick += new System.EventHandler(this.lbListedSignals_DoubleClick);
            // 
            // lbSelectedSignals
            // 
            this.lbSelectedSignals.Dock = System.Windows.Forms.DockStyle.Fill;
            this.lbSelectedSignals.FormattingEnabled = true;
            this.lbSelectedSignals.Location = new System.Drawing.Point(467, 0);
            this.lbSelectedSignals.Name = "lbSelectedSignals";
            this.lbSelectedSignals.SelectionMode = System.Windows.Forms.SelectionMode.MultiExtended;
            this.lbSelectedSignals.Size = new System.Drawing.Size(323, 618);
            this.lbSelectedSignals.TabIndex = 2;
            this.lbSelectedSignals.DoubleClick += new System.EventHandler(this.lbSelectedSignals_DoubleClick);
            // 
            // pnCenter
            // 
            this.pnCenter.Controls.Add(this.ckbIncludeInputs);
            this.pnCenter.Controls.Add(this.btnAddAll);
            this.pnCenter.Controls.Add(this.btnRemoveAll);
            this.pnCenter.Controls.Add(this.btnRemove);
            this.pnCenter.Controls.Add(this.btnAdd);
            this.pnCenter.Dock = System.Windows.Forms.DockStyle.Left;
            this.pnCenter.Location = new System.Drawing.Point(342, 0);
            this.pnCenter.Name = "pnCenter";
            this.pnCenter.Size = new System.Drawing.Size(125, 618);
            this.pnCenter.TabIndex = 3;
            // 
            // ckbIncludeInputs
            // 
            this.ckbIncludeInputs.AutoSize = true;
            this.ckbIncludeInputs.Location = new System.Drawing.Point(36, 173);
            this.ckbIncludeInputs.Name = "ckbIncludeInputs";
            this.ckbIncludeInputs.Size = new System.Drawing.Size(55, 17);
            this.ckbIncludeInputs.TabIndex = 4;
            this.ckbIncludeInputs.Text = "Inputs";
            this.ckbIncludeInputs.UseVisualStyleBackColor = true;
            this.ckbIncludeInputs.CheckedChanged += new System.EventHandler(this.ckbIncludeInputs_CheckedChanged);
            // 
            // btnAddAll
            // 
            this.btnAddAll.Location = new System.Drawing.Point(25, 217);
            this.btnAddAll.Name = "btnAddAll";
            this.btnAddAll.Size = new System.Drawing.Size(75, 23);
            this.btnAddAll.TabIndex = 3;
            this.btnAddAll.Text = "Add All";
            this.btnAddAll.UseVisualStyleBackColor = true;
            this.btnAddAll.Click += new System.EventHandler(this.btnAddAll_Click);
            // 
            // btnRemoveAll
            // 
            this.btnRemoveAll.Location = new System.Drawing.Point(25, 345);
            this.btnRemoveAll.Name = "btnRemoveAll";
            this.btnRemoveAll.Size = new System.Drawing.Size(75, 23);
            this.btnRemoveAll.TabIndex = 2;
            this.btnRemoveAll.Text = "Remove All";
            this.btnRemoveAll.UseVisualStyleBackColor = true;
            this.btnRemoveAll.Click += new System.EventHandler(this.btnRemoveAll_Click);
            // 
            // btnRemove
            // 
            this.btnRemove.Location = new System.Drawing.Point(25, 302);
            this.btnRemove.Name = "btnRemove";
            this.btnRemove.Size = new System.Drawing.Size(75, 23);
            this.btnRemove.TabIndex = 1;
            this.btnRemove.Text = "Remove";
            this.btnRemove.UseVisualStyleBackColor = true;
            this.btnRemove.Click += new System.EventHandler(this.btnRemove_Click);
            // 
            // btnAdd
            // 
            this.btnAdd.Location = new System.Drawing.Point(25, 261);
            this.btnAdd.Name = "btnAdd";
            this.btnAdd.Size = new System.Drawing.Size(75, 23);
            this.btnAdd.TabIndex = 0;
            this.btnAdd.Text = "Add";
            this.btnAdd.UseVisualStyleBackColor = true;
            this.btnAdd.Click += new System.EventHandler(this.btnAdd_Click);
            // 
            // pnLeft
            // 
            this.pnLeft.Dock = System.Windows.Forms.DockStyle.Left;
            this.pnLeft.Location = new System.Drawing.Point(0, 0);
            this.pnLeft.Name = "pnLeft";
            this.pnLeft.Size = new System.Drawing.Size(10, 618);
            this.pnLeft.TabIndex = 4;
            // 
            // pnRight
            // 
            this.pnRight.Dock = System.Windows.Forms.DockStyle.Right;
            this.pnRight.Location = new System.Drawing.Point(790, 0);
            this.pnRight.Name = "pnRight";
            this.pnRight.Size = new System.Drawing.Size(10, 618);
            this.pnRight.TabIndex = 5;
            // 
            // frmSignalSelect
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(800, 654);
            this.Controls.Add(this.lbSelectedSignals);
            this.Controls.Add(this.pnCenter);
            this.Controls.Add(this.lbListedSignals);
            this.Controls.Add(this.pnRight);
            this.Controls.Add(this.pnLeft);
            this.Controls.Add(this.pnControl);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.SizableToolWindow;
            this.Name = "frmSignalSelect";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterParent;
            this.Text = "Select Signals to Display";
            this.Resize += new System.EventHandler(this.frmSignalSelect_Resize);
            this.pnControl.ResumeLayout(false);
            this.pnCenter.ResumeLayout(false);
            this.pnCenter.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.Panel pnControl;
        private System.Windows.Forms.Button btnOK;
        private System.Windows.Forms.ListBox lbListedSignals;
        private System.Windows.Forms.ListBox lbSelectedSignals;
        private System.Windows.Forms.Button btnCancel;
        private System.Windows.Forms.Panel pnCenter;
        private System.Windows.Forms.Button btnRemoveAll;
        private System.Windows.Forms.Button btnRemove;
        private System.Windows.Forms.Button btnAdd;
        private System.Windows.Forms.Button btnAddAll;
        private System.Windows.Forms.CheckBox ckbIncludeInputs;
        private System.Windows.Forms.Panel pnLeft;
        private System.Windows.Forms.Panel pnRight;
    }
}