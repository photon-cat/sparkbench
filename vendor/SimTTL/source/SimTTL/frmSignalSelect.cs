// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using ChipLibrary;

namespace SimTTL
{
    public partial class frmSignalSelect : Form
    {
        /// <summary>List of all available signals in the schematics.</summary>
        public List<DisplaySignal> AllSignals;
        /// <summary>List of all currently listed signals for selection.</summary>
        public List<DisplaySignal> ListedSignals;
        /// <summary>List of all currently selected signals.</summary>
        public List<DisplaySignal> CurrentSignals;

        /// <summary>
        /// Creates this from instance.
        /// </summary>
        public frmSignalSelect()
        {
            InitializeComponent();
            AllSignals = new List<DisplaySignal>();
            ListedSignals = new List<DisplaySignal>();
            CurrentSignals = new List<DisplaySignal>();
        }

        /// <summary>
        /// Form resize event handler.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void frmSignalSelect_Resize(object sender, EventArgs e)
        {
            lbListedSignals.Width = ClientSize.Width / 2;
        }

        /// <summary>
        /// Display all available signals depending on the ckbIncludeInputs state. 
        /// If ckbIncludeInputs is unchecked, inputs are not listed.
        /// </summary>
        public void ShowAllSignals()
        {
            lbListedSignals.Items.Clear();
            ListedSignals.Clear();
            for (int i = 0; i < AllSignals.Count; i++)
                if ((ckbIncludeInputs.Checked == true) || (AllSignals[i].Input == false))
                    ListedSignals.Add(AllSignals[i]);

            ListedSignals.Sort((x, y) => x.ScreenName.CompareTo(y.ScreenName));

            for (int i= 0; i < ListedSignals.Count; i++)
                lbListedSignals.Items.Add(ListedSignals[i].ScreenName);
        }

        /// <summary>
        /// Fill both list boxes with the available and selected signals.
        /// </summary>
        public void ShowLists()
        {
            ShowAllSignals();
            ShowSelected();
        }

        /// <summary>
        /// Fill the selected listbox with the CurrentSignals contents.
        /// </summary>
        public void ShowSelected()
        {
            lbSelectedSignals.Items.Clear();
            for (int i = 0; i < CurrentSignals.Count; i++)
                lbSelectedSignals.Items.Add(CurrentSignals[i].ScreenName);
        }

        /// <summary>
        /// Mouse double click event handler to copy the selected signal from the available signal list to the selected signal list.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void lbListedSignals_DoubleClick(object sender, EventArgs e)
        {
            int idx = lbListedSignals.SelectedIndex;
            CurrentSignals.Add(ListedSignals[idx]);
            lbSelectedSignals.Items.Add(ListedSignals[idx].ScreenName);
        }

        /// <summary>
        /// Mouse double click event handler to remove the selected signal from the selected signal list.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void lbSelectedSignals_DoubleClick(object sender, EventArgs e)
        {
            try
            {
                int idx = lbSelectedSignals.SelectedIndex;
                CurrentSignals.RemoveAt(idx);
                ShowSelected();
            }
            catch { }
        }

        /// <summary>
        /// Button click event handler to add all signals from the available list to the current selected list.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void btnAddAll_Click(object sender, EventArgs e)
        {
            foreach (DisplaySignal signal in ListedSignals)
                CurrentSignals.Add(signal);
            ShowSelected();
        }

        /// <summary>
        /// Button click event handler to add all currently selected signals from the available list to the current selected list.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void btnAdd_Click(object sender, EventArgs e)
        {
            foreach (int idx in lbListedSignals.SelectedIndices)
            {
                CurrentSignals.Add(ListedSignals[idx]);
                lbSelectedSignals.Items.Add(ListedSignals[idx].ScreenName);
            }
        }

        /// <summary>
        /// Button click event handler to remove all currently selected signals from the current selected list.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void btnRemove_Click(object sender, EventArgs e)
        {
            for (int i=lbSelectedSignals.SelectedIndices.Count-1; i>=0; i--)
            {
                CurrentSignals.RemoveAt(lbSelectedSignals.SelectedIndices[i]);
            }
            ShowSelected();
        }

        /// <summary>
        /// Button click event handler to remove signals from the current selected list.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void btnRemoveAll_Click(object sender, EventArgs e)
        {
            lbSelectedSignals.Items.Clear();
            CurrentSignals.Clear();
        }

        /// <summary>
        /// Checkbox change event handler to include or exclude all inputs from the available list.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void ckbIncludeInputs_CheckedChanged(object sender, EventArgs e)
        {
            ShowAllSignals();
        }
    }
}
